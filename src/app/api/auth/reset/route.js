import crypto from "node:crypto";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { route, body } from "@/lib/http";
import { resetSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth";
import { bumpTokenVersion } from "@/lib/tokenVersion";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { audit, ACTIONS } from "@/lib/audit";

export const POST = route(
  async ({ req }) => {
    if (!(await rateLimitAsync(`reset:${clientIp(req)}`, { limit: 10, windowMs: 15 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { token, password } = await body(req, resetSchema);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await PasswordResetToken.findOne({ tokenHash, usedAt: null });
    if (!record) throw new ApiError("TOKEN_INVALID");
    if (record.expiresAt < new Date()) throw new ApiError("TOKEN_EXPIRED");

    const user = await User.findById(record.user);
    if (!user) throw new ApiError("TOKEN_INVALID");

    user.passwordHash = await hashPassword(password);
    await user.save();
    // Parol o'zgardi — eski qurilmalardagi sessiyalar bekor qilinadi
    await bumpTokenVersion(user._id);

    record.usedAt = new Date();
    await record.save();
    // Ehtiyot chorasi: qolgan barcha tiklash havolalari bekor qilinadi
    await PasswordResetToken.deleteMany({ user: user._id, usedAt: null });

    await audit({ sub: user._id, name: user.fullName, role: user.role },
      ACTIONS.PASSWORD_RESET, { targetType: "User", targetId: user._id }, req);
    return { ok: true };
  },
  { auth: false }
);
