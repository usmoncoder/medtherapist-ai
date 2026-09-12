import User from "@/models/User";
import { route, body } from "@/lib/http";
import { totpSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { verifyTotp, generateBackupCodes, hashCode } from "@/lib/totp";
import { audit, ACTIONS } from "@/lib/audit";

export const POST = route(async ({ req, session }) => {
  const { code } = await body(req, totpSchema);
  const user = await User.findById(session.sub);
  if (!user?.twoFactor?.secret) throw new ApiError("TWO_FACTOR_INVALID");
  if (!verifyTotp(user.twoFactor.secret, code)) throw new ApiError("TWO_FACTOR_INVALID");

  const backupCodes = generateBackupCodes();
  user.twoFactor.enabled = true;
  user.twoFactor.confirmedAt = new Date();
  user.twoFactor.backupCodes = backupCodes.map(hashCode);
  await user.save();

  await audit(session, ACTIONS.TWO_FACTOR_ENABLE, { targetType: "User", targetId: user._id }, req);
  // Zaxira kodlar faqat shu yerda bir marta ko'rsatiladi
  return { ok: true, backupCodes };
});
