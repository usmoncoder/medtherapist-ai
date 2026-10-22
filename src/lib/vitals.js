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

/**
 * Tana haroratini terish paytida nuqtani o'zi qo'yadi: 366 → 36.6.
 * Butun qism ikki xonali, keyin bitta kasr raqami (XX.X). 50 °C dan yuqori
 * qiymat kiritib bo'lmaydi — chegaraga yetganda 50 ga tenglashtiriladi.
 */
export function formatTemp(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  const intPart = digits.slice(0, 2);
  const dec = digits.slice(2, 3);
  const value = dec ? Number(`${intPart}.${dec}`) : Number(intPart);
  if (value > 50) return "50";
  return dec ? `${intPart}.${dec}` : intPart;
}

/**
 * SpO₂ (qondagi kislorod to'yinganligi) — faqat butun foiz, 0–100 oralig'ida.
 * 100 dan katta qiymat 100 ga cheklanadi.
 */
export function formatSpo2(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  return String(Math.min(100, Number(digits)));
}
