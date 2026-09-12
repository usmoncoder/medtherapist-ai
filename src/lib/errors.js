// Barcha API xatolari shu kodlar bilan qaytadi.
// Klient kodni o'z tiliga tarjima qiladi (src/lib/i18n) — server matni zaxira sifatida qoladi.
export const CODES = {
  AUTH_REQUIRED: [401, "Avtorizatsiya talab qilinadi"],
  FORBIDDEN: [403, "Ruxsat yo'q"],
  NOT_FOUND: [404, "Topilmadi"],
  VALIDATION: [400, "Ma'lumotlar noto'g'ri"],
  RATE_LIMITED: [429, "Juda ko'p urinish — biroz kutib turing"],
  SERVER_ERROR: [500, "Serverda xatolik"],

  EMAIL_TAKEN: [409, "Bu email allaqachon ro'yxatdan o'tgan"],
  BAD_CREDENTIALS: [401, "Email yoki parol noto'g'ri"],
  ACCOUNT_DISABLED: [403, "Hisob faolsizlantirilgan"],
  SELF_ACTION: [400, "O'z hisobingizga bu amalni qo'llay olmaysiz"],
  LAST_SUPERADMIN: [400, "Tizimda kamida bitta bosh administrator qolishi kerak"],
  ROLE_NOT_ALLOWED: [403, "Bu rolni boshqarishga ruxsatingiz yo'q"],
  USER_NOT_FOUND: [404, "Foydalanuvchi topilmadi"],

  TWO_FACTOR_REQUIRED: [401, "Ikki bosqichli tasdiqlash kodi kerak"],
  TWO_FACTOR_INVALID: [401, "Tasdiqlash kodi noto'g'ri"],
  TWO_FACTOR_ALREADY: [409, "Ikki bosqichli tasdiqlash allaqachon yoqilgan"],
  TOKEN_INVALID: [400, "Havola yaroqsiz"],
  TOKEN_EXPIRED: [400, "Havola muddati tugagan"],

  DOCTOR_NOT_FOUND: [404, "Shifokor topilmadi"],
  PATIENT_NOT_FOUND: [404, "Bemor topilmadi"],
  NO_DOCTOR_ASSIGNED: [400, "Sizga hali shifokor biriktirilmagan — administratorga murojaat qiling"],

  APPT_NOT_FOUND: [404, "Navbat topilmadi"],
  APPT_PAST: [400, "O'tgan vaqtga navbat olib bo'lmaydi"],
  APPT_TOO_FAR: [400, "Navbatni 90 kundan uzoqqa belgilab bo'lmaydi"],
  APPT_SLOT_TAKEN: [409, "Bu vaqt band — boshqa vaqtni tanlang"],
  APPT_DUPLICATE: [409, "Bu vaqtga so'rovingiz allaqachon bor"],
  APPT_STATUS_NOT_ALLOWED: [400, "Bu holatni o'zgartira olmaysiz"],
  SLOT_UNAVAILABLE: [409, "Bu vaqt shifokor jadvalida yo'q"],
  SCHEDULE_MISSING: [400, "Shifokor hali ish vaqtini belgilamagan"],

  ANALYSIS_NOT_FOUND: [404, "Analiz topilmadi"],
  CONVERSATION_NOT_FOUND: [404, "Suhbat topilmadi"],
  MESSAGE_EMPTY: [400, "Xabar bo'sh"],

  FILE_TOO_LARGE: [413, "Fayl juda katta (maksimum 10 MB)"],
  FILE_TYPE: [415, "Bu fayl turi qo'llab-quvvatlanmaydi"],
  FILE_NOT_FOUND: [404, "Fayl topilmadi"],

  AI_NOT_CONFIGURED: [503, "GEMINI_API_KEY sozlanmagan"],
  AI_FAILED: [502, "AI tahlil bajarilmadi"],
  AI_BUSY: [503, "AI xizmati band — biroz kutib qayta urinib ko'ring"],
};

export class ApiError extends Error {
  constructor(code, detail) {
    const [status, message] = CODES[code] || CODES.SERVER_ERROR;
    super(message);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}
