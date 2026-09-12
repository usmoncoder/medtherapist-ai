import User from "@/models/User";
import { route, body } from "@/lib/http";
import { updateMeSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";

export const GET = route(async ({ session }) => {
  const user = await User.findById(session.sub);
  if (!user) throw new ApiError("NOT_FOUND");
  return { user: user.toPublic() };
});

const toList = (v) =>
  Array.isArray(v)
    ? v.map((s) => String(s).trim()).filter(Boolean)
    : String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const pick = (src, keys) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

// Faqat o'z profilini tahrirlash.
// Shifokorga biriktirish bu yerda emas — buni administrator /api/admin/assign orqali qiladi.
export const PATCH = route(async ({ req, session }) => {
  const data = await body(req, updateMeSchema);
  const user = await User.findById(session.sub);
  if (!user) throw new ApiError("NOT_FOUND");

  if (data.fullName) user.fullName = data.fullName;
  const p = data.profile || {};

  if (user.role === "patient") {
    // Bemor faqat shaxsiy ma'lumotini o'zgartiradi.
    // Allergiya, surunkali kasalliklar, shikoyat va anamnez — shifokorning yozuvi,
    // ular bu yerdan kelsa ham e'tiborga olinmaydi.
    const base = user.patientProfile?.toObject?.() ?? user.patientProfile ?? {};
    const next = { ...base, ...pick(p, ["phone", "address", "bloodType"]) };
    if (p.birthDate !== undefined) next.birthDate = p.birthDate || undefined;
    if (p.gender !== undefined) next.gender = p.gender || undefined;
    user.patientProfile = next;
  } else if (user.role === "doctor") {
    const base = user.doctorProfile?.toObject?.() ?? user.doctorProfile ?? {};
    const next = {
      ...base,
      ...pick(p, ["specialty", "department", "clinic", "room", "phone", "bio", "licenseNumber"]),
    };
    if (p.experienceYears !== undefined)
      next.experienceYears = Math.max(0, Math.min(70, Number(p.experienceYears) || 0));
    user.doctorProfile = next;
  }

  await user.save();
  return { user: user.toPublic() };
});
