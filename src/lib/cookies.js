// Sessiya cookie'si uchun yagona sozlama
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 kun

/**
 * `secure` odatda production'da yoqiladi — ya'ni cookie faqat HTTPS orqali yuboriladi.
 * Lokal mashinada `npm start` ni HTTP'da sinash uchun COOKIE_SECURE=false qo'ying.
 * Haqiqiy serverda buni O'ZGARTIRMANG: HTTPS ortida true bo'lishi shart.
 */
const secure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure,
  path: "/",
  maxAge: MAX_AGE,
});
