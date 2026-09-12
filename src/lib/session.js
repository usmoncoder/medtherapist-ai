import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "./jwt";
import { hasRole } from "./roles";

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  // 2FA yarim sessiyasi to'liq sessiya sifatida qabul qilinmaydi
  if (!payload || payload.pending2fa) return null;
  return payload;
}

/** 2FA kutayotgan yarim sessiya — faqat kodni tekshirish uchun */
export async function getPendingSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.pending2fa ? payload : null;
}

export async function requireSession(role) {
  const s = await getSession();
  if (!s) return { error: "Avtorizatsiya talab qilinadi", status: 401 };
  if (!hasRole(s.role, role)) return { error: "Ruxsat yo'q", status: 403 };
  return { session: s };
}
