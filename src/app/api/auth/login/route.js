import { NextResponse } from "next/server";
import User from "@/models/User";
import { comparePassword, signToken, COOKIE } from "@/lib/auth";
import { route, body } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { cookieOptions } from "@/lib/cookies";
import { audit, ACTIONS } from "@/lib/audit";

export const POST = route(
  async ({ req }) => {
    const ip = clientIp(req);
    if (!(await rateLimitAsync(`login:${ip}`, { limit: 10, windowMs: 10 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { email, password } = await body(req, loginSchema);
    const user = await User.findOne({ email });

    // Bir xil xabar — qaysi email mavjudligini oshkor qilmaymiz
    const okPass = user && (await comparePassword(password, user.passwordHash));
    if (!okPass) {
      await audit(null, ACTIONS.LOGIN_FAILED, { targetName: email, meta: { email } }, req);
      throw new ApiError("BAD_CREDENTIALS");
    }
    if (!user.isActive) throw new ApiError("ACCOUNT_DISABLED");

    // Ikki bosqichli tasdiqlash yoqilgan bo'lsa — yarim sessiya beramiz
    if (user.twoFactor?.enabled) {
      const pending = await signToken({ sub: user._id.toString(), pending2fa: true }, "10m");
      const res = NextResponse.json({ twoFactorRequired: true });
      res.cookies.set(COOKIE, pending, { ...cookieOptions(), maxAge: 600 });
      return res;
    }

    user.lastSeenAt = new Date();
    await user.save();

    const token = await signToken({
      sub: user._id.toString(),
      role: user.role,
      name: user.fullName,
      tv: user.tokenVersion || 0,
    });
    await audit({ sub: user._id, name: user.fullName, role: user.role }, ACTIONS.LOGIN, {}, req);

    const res = NextResponse.json({ user: user.toPublic() });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  },
  { auth: false }
);
