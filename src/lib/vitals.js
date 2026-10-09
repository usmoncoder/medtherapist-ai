/**
 * Qon bosimini terish paytida "/" belgisini o'zi qo'yadi: 11080 → 110/80.
 *
 * Sistolik bosim 2 yoki 3 xonali bo'ladi. Qaysi biri ekanini birinchi raqamdan
 * bilamiz: 1 yoki 2 bilan boshlansa (110, 155, 200) — uch xonali, aks holda
 * (90, 85, 70) — ikki xonali. Shu sabab 9060 → 90/60, 11080 → 110/80.
 */
export function formatBp(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 6);
  if (!digits) return "";
  const sysLen = /^[12]/.test(digits) ? 3 : 2;
  if (digits.length <= sysLen) return digits;
  return `${digits.slice(0, sysLen)}/${digits.slice(sysLen)}`;
}
