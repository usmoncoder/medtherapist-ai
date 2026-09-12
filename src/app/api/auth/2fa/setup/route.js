import QRCode from "qrcode";
import User from "@/models/User";
import { route } from "@/lib/http";
import { ApiError } from "@/lib/errors";
import { generateSecret, otpauthUri } from "@/lib/totp";

// Sirni yaratadi va QR kodni qaytaradi. Yoqilishi "enable" da tasdiqlanadi.
export const POST = route(async ({ session }) => {
  const user = await User.findById(session.sub);
  if (!user) throw new ApiError("USER_NOT_FOUND");
  if (user.twoFactor?.enabled) throw new ApiError("TWO_FACTOR_ALREADY");

  const secret = generateSecret();
  user.twoFactor = { enabled: false, secret, backupCodes: [] };
  await user.save();

  const uri = otpauthUri(secret, user.email);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#15132A", light: "#FFFFFF" } });
  return { secret, uri, qr };
});
