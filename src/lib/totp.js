// RFC 6238 TOTP — tashqi kutubxonasiz, node:crypto ustida
import crypto from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;
const DIGITS = 6;

export function generateSecret(len = 20) {
  const buf = crypto.randomBytes(len);
  let bits = "", out = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s) {
  const clean = s.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "";
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    bits += i.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Kod to'g'rimi. window=1 — soat farqiga ±30 soniya bardosh beradi. */
export function verifyTotp(secret, token, window = 1) {
  if (!secret || !/^\d{6}$/.test(String(token || "").trim())) return false;
  const counter = Math.floor(Date.now() / 1000 / STEP);
  const clean = String(token).trim();
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secret, counter + i);
    // Vaqt bo'yicha hujumga qarshi doimiy vaqtli solishtirish
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return true;
  }
  return false;
}

export const otpauthUri = (secret, email, issuer = "MedTherapist AI") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;

export const hashCode = (code) =>
  crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");

export function generateBackupCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    codes.push(crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g).join("-"));
  }
  return codes;
}
