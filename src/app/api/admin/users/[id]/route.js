import User from "@/models/User";
import { route, body } from "@/lib/http";
import { adminUpdateUserSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth";
import { bumpTokenVersion, invalidateCache } from "@/lib/tokenVersion";
import { canManage } from "@/lib/roles";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { encryptProfile } from "@/lib/crypto";

export const PATCH = route(
  async ({ req, params, session }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
    const d = await body(req, adminUpdateUserSchema);
    const isSuper = session.role === "superadmin";

    const user = await User.findById(params.id);
    if (!user) throw new ApiError("USER_NOT_FOUND");
    if (!canManage(session.role, user.role)) throw new ApiError("ROLE_NOT_ALLOWED");
    if (user._id.toString() === session.sub && (d.isActive === false || d.role))
      throw new ApiError("SELF_ACTION");

    if (d.fullName) user.fullName = d.fullName;
    if (d.password) {
      user.passwordHash = await hashPassword(d.password);
      user.tokenVersion = (user.tokenVersion || 0) + 1; // eski sessiyalar bekor
    }

    /* ---- Faqat bosh administrator: rol o'zgartirish ---- */
    if (d.role && d.role !== user.role) {
      if (!isSuper) throw new ApiError("ROLE_NOT_ALLOWED");
      if (user.role === "superadmin") {
        const left = await User.countDocuments({ role: "superadmin", isActive: true });
        if (left <= 1) throw new ApiError("LAST_SUPERADMIN");
      }
      const from = user.role;
      user.role = d.role;
      if (d.role === "doctor" && !user.doctorProfile) user.doctorProfile = { specialty: "Terapevt" };
      if (d.role === "patient" && !user.patientProfile) user.patientProfile = {};
      await audit(session, ACTIONS.ROLE_CHANGE, {
        targetType: "User", targetId: user._id, targetName: user.fullName,
        meta: { from, to: d.role },
      }, req);
    }

    /* ---- Faqat bosh administrator: shifokor litsenziyasini tasdiqlash ---- */
    if (d.isVerified !== undefined) {
      if (!isSuper) throw new ApiError("ROLE_NOT_ALLOWED");
      if (user.role !== "doctor") throw new ApiError("VALIDATION", "Faqat shifokor tasdiqlanadi");
      const base = user.doctorProfile?.toObject?.() ?? user.doctorProfile ?? {};
      user.doctorProfile = { ...base, isVerified: d.isVerified };
      await audit(session, ACTIONS.DOCTOR_VERIFY, {
        targetType: "User", targetId: user._id, targetName: user.fullName,
        meta: { isVerified: d.isVerified },
      }, req);
      await notify(user._id, {
        type: "system",
        titleKey: d.isVerified ? "notif.doctorVerified" : "notif.doctorUnverified",
        tone: d.isVerified ? "green" : "amber",
        page: "profile",
      });
    }

    /* ---- Faqat bosh administrator: 2FA ni majburan tiklash (telefon yo'qolganda) ---- */
    if (d.resetTwoFactor) {
      if (!isSuper) throw new ApiError("ROLE_NOT_ALLOWED");
      user.twoFactor = { enabled: false, secret: undefined, backupCodes: [] };
      await audit(session, ACTIONS.TWO_FACTOR_RESET, {
        targetType: "User", targetId: user._id, targetName: user.fullName,
      }, req);
      await notify(user._id, {
        type: "system", titleKey: "notif.twoFactorReset", tone: "red", page: "security",
      });
    }

    if (d.isActive !== undefined && d.isActive !== user.isActive) {
      if (user.role === "superadmin" && d.isActive === false) {
        const left = await User.countDocuments({ role: "superadmin", isActive: true });
        if (left <= 1) throw new ApiError("LAST_SUPERADMIN");
      }
      user.isActive = d.isActive;
      if (!d.isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
      await audit(session, d.isActive ? ACTIONS.USER_ACTIVATE : ACTIONS.USER_DEACTIVATE,
        { targetType: "User", targetId: user._id, targetName: user.fullName }, req);
      await notify(user._id, {
        type: "system",
        titleKey: d.isActive ? "notif.accountActivated" : "notif.accountDisabled",
        tone: d.isActive ? "green" : "red",
        page: "dashboard",
      });
    }

    if (d.profile) {
      const key = user.role === "doctor" ? "doctorProfile" : "patientProfile";
      const base = user[key]?.toObject?.() ?? user[key] ?? {};
      const incoming = user.role === "patient" ? encryptProfile(d.profile) : d.profile;
      user[key] = { ...base, ...incoming };
    }

    await user.save();
    invalidateCache(user._id);
    await audit(session, ACTIONS.USER_UPDATE,
      { targetType: "User", targetId: user._id, targetName: user.fullName }, req);

    return { user: user.toPublic() };
  },
  { role: ["admin", "superadmin"] }
);
