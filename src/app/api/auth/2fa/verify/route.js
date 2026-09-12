import { NextResponse } from "next/server";
import User from "@/models/User";
import { route, body } from "@/lib/http";
import { totpSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { getPendingSession } from "@/lib/session";
import { verifyTotp, hashCode } from "@/lib/totp";
import { signToken, COOKIE } from "@/lib/auth";
import { cookieOptions } from "@/lib/cookies";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { audit, ACTIONS } from "@/lib/audit";

// Kirishning ikkinchi bosqichi: yarim sessiyani to'liq sessiyaga aylantiradi
export const POST = route(
  async ({ req }) => {
    const pending = await getPendingSession();
    if (!pending) throw new ApiError("TWO_FACTOR_REQUIRED");
    if (!(await rateLimitAsync(`2fa:${clientIp(req)}`, { limit: 10, windowMs: 10 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { code } = await body(req, totpSchema);
    const user = await User.findById(pending.sub);
    if (!user?.twoFactor?.enabled) throw new ApiError("TWO_FACTOR_INVALID");
    if (!user.isActive) throw new ApiError("ACCOUNT_DISABLED");

    const byTotp = verifyTotp(user.twoFactor.secret, code);
    const hashed = hashCode(code);
    const byBackup = (user.twoFactor.backupCodes || []).includes(hashed);
    if (!byTotp && !byBackup) throw new ApiError("TWO_FACTOR_INVALID");

    if (byBackup) {
      // Ishlatilgan zaxira kod bekor qilinadi
      user.twoFactor.backupCodes = user.twoFactor.backupCodes.filter((c) => c !== hashed);
    }
    user.lastSeenAt = new Date();
    await user.save();

    const token = await signToken({
      sub: user._id.toString(),
      role: user.role,
      name: user.fullName,
      tv: user.tokenVersion || 0,
    });
    await audit({ sub: user._id, name: user.fullName, role: user.role }, ACTIONS.LOGIN,
      { meta: { twoFactor: byBackup ? "backup" : "totp" } }, req);

    const res = NextResponse.json({ user: user.toPublic() });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  },
  { auth: false }
);
