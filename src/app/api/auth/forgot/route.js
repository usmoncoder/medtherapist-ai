import crypto from "node:crypto";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { route, body } from "@/lib/http";
import { forgotSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { passwordResetMail, mailerConfigured } from "@/lib/mailer";
import { audit, ACTIONS } from "@/lib/audit";
import { logger } from "@/lib/logger";

const TTL_MS = 60 * 60 * 1000; // 1 soat

export const POST = route(
  async ({ req }) => {
    const ip = clientIp(req);
    if (!(await rateLimitAsync(`forgot:${ip}`, { limit: 5, windowMs: 15 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { email, lang } = await body(req, forgotSchema);
    const user = await User.findOne({ email, isActive: true });

    // Email mavjudligini oshkor qilmaymiz — javob har doim bir xil
    if (user) {
      await PasswordResetToken.deleteMany({ user: user._id, usedAt: null });
      const token = crypto.randomBytes(32).toString("hex");
      await PasswordResetToken.create({
        user: user._id,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + TTL_MS),
        ip,
      });

      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const link = `${base}/reset?token=${token}`;
      const sent = await passwordResetMail(user.email, link, lang || "uz");
      if (!sent.delivered) logger.info("parolni tiklash havolasi", { email: user.email, link });

      await audit({ sub: user._id, name: user.fullName, role: user.role },
        ACTIONS.PASSWORD_RESET_REQUEST, { targetType: "User", targetId: user._id }, req);
    }

    return { ok: true, mailer: mailerConfigured() };
  },
  { auth: false }
);
