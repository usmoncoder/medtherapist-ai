import { z } from "zod";

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID noto'g'ri");
const trimmed = (min, max, msg) => z.string().trim().min(min, msg).max(max, msg);
const password = z
  .string()
  .min(8, "Parol kamida 8 belgi")
  .max(128, "Parol juda uzun")
  .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lsin")
  .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lsin");

export const registerSchema = z.object({
  fullName: trimmed(3, 120, "Ism 3–120 belgi bo'lsin"),
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  password,
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  password: z.string().min(1, "Parolni kiriting").max(128),
});

export const totpSchema = z.object({
  code: z.string().trim().min(5, "Kodni kiriting").max(16),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  lang: z.enum(["uz", "uzc", "ru"]).optional(),
});

export const resetSchema = z.object({
  token: z.string().trim().min(20, "Havola yaroqsiz").max(200),
  password,
});

// Bemorning O'ZI tahrirlay oladigan maydonlar — shaxsiy va aloqa ma'lumotlari.
// Tibbiy ma'lumot (allergiya, surunkali kasalliklar, shikoyat, anamnez) bu yerda YO'Q:
// uni faqat shifokor kiritadi (klinik yozuv yaxlitligi uchun).
export const patientSelfProfileSchema = z.object({
  birthDate: z.string().trim().optional().or(z.literal("")),
  gender: z.enum(["erkak", "ayol"]).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  bloodType: z.string().trim().max(10).optional(),
});

// Shifokor tahrirlaydigan tibbiy qism
export const patientMedicalSchema = z.object({
  complaint: z.string().trim().max(2000).optional(),
  history: z.string().trim().max(4000).optional(),
  bloodType: z.string().trim().max(10).optional(),
  allergies: z.union([z.array(z.string().trim().max(60)).max(20), z.string().max(400)]).optional(),
  chronicConditions: z
    .union([z.array(z.string().trim().max(60)).max(20), z.string().max(400)])
    .optional(),
});

// Administrator to'liq kartani tahrirlashi mumkin
export const patientProfileSchema = patientSelfProfileSchema.merge(patientMedicalSchema);

export const doctorProfileSchema = z.object({
  specialty: z.string().trim().max(80).optional(),
  department: z.string().trim().max(80).optional(),
  clinic: z.string().trim().max(120).optional(),
  room: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(30).optional(),
  experienceYears: z.union([z.number(), z.string()]).optional(),
  bio: z.string().trim().max(1000).optional(),
  licenseNumber: z.string().trim().max(60).optional(),
});

export const updateMeSchema = z.object({
  fullName: trimmed(3, 120, "Ism 3–120 belgi bo'lsin").optional(),
  profile: z.union([patientSelfProfileSchema, doctorProfileSchema]).optional(),
});

/* ---------------- ADMIN ---------------- */
export const adminCreateUserSchema = z.object({
  fullName: trimmed(3, 120, "Ism 3–120 belgi bo'lsin"),
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  password,
  role: z.enum(["patient", "doctor", "admin", "superadmin"]),
  phone: z.string().trim().max(30).optional(),
  specialty: z.string().trim().max(80).optional(),
  department: z.string().trim().max(80).optional(),
});

export const adminUpdateUserSchema = z.object({
  fullName: trimmed(3, 120, "Ism 3–120 belgi bo'lsin").optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["patient", "doctor", "admin", "superadmin"]).optional(),
  password: password.optional(),
  // Quyidagi ikkitasi faqat bosh administrator uchun
  isVerified: z.boolean().optional(),
  resetTwoFactor: z.boolean().optional(),
  profile: z.union([patientProfileSchema, doctorProfileSchema]).optional(),
});

export const assignSchema = z.object({
  patientId: objectId,
  doctorId: objectId.nullable(),
});

/* ---------------- JADVAL ---------------- */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Vaqt HH:MM ko'rinishida");
export const scheduleSchema = z.object({
  slotMin: z.number().int().min(10).max(120).optional(),
  workdays: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), from: hhmm, to: hhmm }))
    .max(21),
  daysOff: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(120).optional(),
});

/* ---------------- NAVBAT ---------------- */
export const createAppointmentSchema = z.object({
  doctorId: objectId.optional(),
  startsAt: z.string().min(1, "Sana va vaqtni tanlang"),
  durationMin: z.number().int().min(10).max(180).optional(),
  reason: trimmed(3, 500, "Murojaat sababi 3–500 belgi"),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(["tasdiqlangan", "rad etilgan", "bekor qilingan", "yakunlangan"]),
  doctorNote: z.string().trim().max(1000).optional(),
});

/* ---------------- ANALIZ (faqat shifokor kiritadi) ---------------- */
export const createAnalysisSchema = z.object({
  patientId: objectId,
  name: trimmed(1, 120, "Analiz nomini yozing"),
  value: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  unit: z.string().trim().max(30).optional(),
  refRange: z.string().trim().max(60).optional(),
  flag: z.enum(["norma", "yuqori", "past", "kritik"]).optional(),
  takenAt: z.string().optional().or(z.literal("")),
  doctorComment: z.string().trim().max(2000).optional(),
  attachments: z.array(objectId).max(5).optional(),
});

export const updateAnalysisSchema = z.object({
  doctorComment: z.string().trim().max(2000).optional(),
  flag: z.enum(["norma", "yuqori", "past", "kritik"]).optional(),
  value: z.string().trim().max(60).optional(),
});

/* ---------------- AI / CHAT ---------------- */
export const aiRequestSchema = z.object({
  patientId: objectId,
  complaint: trimmed(3, 3000, "Shikoyatlarni yozing"),
  symptoms: z.array(z.string().trim().max(60)).max(20).optional(),
  bp: z.string().trim().max(20).optional(),
  pulse: z.union([z.string(), z.number()]).optional(),
  extra: z.string().trim().max(3000).optional(),
});

export const createConversationSchema = z.object({ doctorId: objectId });

export const messageSchema = z
  .object({
    text: z.string().trim().max(4000).optional().default(""),
    attachments: z.array(objectId).max(5).optional(),
  })
  .refine((d) => d.text.length > 0 || (d.attachments?.length || 0) > 0, {
    message: "Xabar bo'sh",
  });

export const readNotificationsSchema = z.object({
  ids: z.array(objectId).max(100).optional(),
  all: z.boolean().optional(),
});

/* ---------------- BOSH ADMINISTRATOR ---------------- */
export const staffActionSchema = z.object({
  isVerified: z.boolean().optional(),
  resetTwoFactor: z.boolean().optional(),
});

/* ---------------- QABUL XULOSASI (SOAP) ---------------- */
export const encounterSchema = z.object({
  appointmentId: objectId.optional(),
  patientId: objectId,
  subjective: z.string().trim().max(4000).optional(),
  objective: z.string().trim().max(4000).optional(),
  assessment: trimmed(2, 2000, "Xulosa (tashxis) yozilishi shart"),
  plan: z.string().trim().max(4000).optional(),
  vitals: z
    .object({
      bp: z.string().trim().max(20).optional(),
      pulse: z.string().trim().max(10).optional(),
      temp: z.string().trim().max(10).optional(),
      weight: z.string().trim().max(10).optional(),
    })
    .optional(),
  prescriptions: z
    .array(
      z.object({
        name: z.string().trim().max(120),
        dose: z.string().trim().max(80).optional(),
        duration: z.string().trim().max(80).optional(),
        note: z.string().trim().max(200).optional(),
      })
    )
    .max(12)
    .optional(),
  followUpAt: z.string().optional().or(z.literal("")),
});

export const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  stack: z.string().trim().max(4000).optional(),
  page: z.string().trim().max(200).optional(),
});
