import { NextResponse } from "next/server";
import User from "@/models/User";
import { hashPassword, signToken, COOKIE } from "@/lib/auth";
import { route, body } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { cookieOptions } from "@/lib/cookies";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";

// Ochiq ro'yxatdan o'tish — faqat BEMOR uchun.
// Shifokor, administrator va bosh administrator hisoblarini admin panel yaratadi.
export const POST = route(
  async ({ req }) => {
    const ip = clientIp(req);
    if (!(await rateLimitAsync(`register:${ip}`, { limit: 5, windowMs: 10 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { fullName, email, password, phone } = await body(req, registerSchema);
    if (await User.exists({ email })) throw new ApiError("EMAIL_TAKEN");

    const user = await User.create({
      fullName,
      email,
      role: "patient",
      passwordHash: await hashPassword(password),
      patientProfile: { phone, cardNumber: `MT-${Date.now().toString(36).toUpperCase()}` },
    });

    await audit({ sub: user._id, name: fullName, role: "patient" }, ACTIONS.REGISTER,
      { targetType: "User", targetId: user._id, targetName: fullName }, req);

    // Administratorlarga yangi bemor haqida xabar — biriktirish kerak
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] }, isActive: true })
      .select("_id").lean();
    for (const a of admins) {
      await notify(a._id, {
        type: "assignment",
        titleKey: "notif.newPatientRegistered",
        vars: { name: fullName },
        page: "assign",
        tone: "blue",
      });
    }

    const token = await signToken({ sub: user._id.toString(), role: "patient", name: fullName, tv: 0 });
    const res = NextResponse.json({ user: user.toPublic() }, { status: 201 });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  },
  { auth: false }
);
