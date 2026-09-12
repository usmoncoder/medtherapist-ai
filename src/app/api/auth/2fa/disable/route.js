import User from "@/models/User";
import { route, body } from "@/lib/http";
import { totpSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { verifyTotp, hashCode } from "@/lib/totp";
import { audit, ACTIONS } from "@/lib/audit";

export const POST = route(async ({ req, session }) => {
  const { code } = await body(req, totpSchema);
  const user = await User.findById(session.sub);
  if (!user?.twoFactor?.enabled) throw new ApiError("TWO_FACTOR_INVALID");

  const okCode =
    verifyTotp(user.twoFactor.secret, code) ||
    (user.twoFactor.backupCodes || []).includes(hashCode(code));
  if (!okCode) throw new ApiError("TWO_FACTOR_INVALID");

  user.twoFactor = { enabled: false, secret: undefined, backupCodes: [] };
  await user.save();
  await audit(session, ACTIONS.TWO_FACTOR_DISABLE, { targetType: "User", targetId: user._id }, req);
  return { ok: true };
});
