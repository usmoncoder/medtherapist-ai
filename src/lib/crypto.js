// Tibbiy matnni bazada shifrlangan holda saqlash (AES-256-GCM).
// Kalit bo'lmasa shifrlash o'chadi, lekin eski shifrlangan qiymatlar baribir o'qiladi.
import crypto from "node:crypto";
import { logger } from "./logger";

const PREFIX = "enc:v1:";
let key = null;
let checked = false;

function getKey() {
  if (checked) return key;
  checked = true;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    logger.warn("ENCRYPTION_KEY yo'q — tibbiy matn ochiq saqlanadi");
    return null;
  }
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    logger.error("ENCRYPTION_KEY 32 bayt bo'lishi kerak (64 hex yoki base64)");
    return null;
  }
  key = buf;
  return key;
}

export const encryptionEnabled = () => Boolean(getKey());

export function encrypt(text) {
  const k = getKey();
  if (!k || text == null || text === "") return text;
  if (typeof text !== "string") return text;
  if (text.startsWith(PREFIX)) return text; // allaqachon shifrlangan
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, enc].map((b) => b.toString("base64")).join(":");
}

export function decrypt(value) {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return value; // eski ochiq matn
  const k = getKey();
  if (!k) return "";  // kalit yo'q — matnni ko'rsatmaymiz
  try {
    const [ivB, tagB, dataB] = value.slice(PREFIX.length).split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
  } catch (e) {
    logger.error("shifrni ochib bo'lmadi", { message: e.message });
    return "";
  }
}

/** Bemor profilidagi maxfiy matn maydonlari */
const PROFILE_FIELDS = ["complaint", "history"];

export function encryptProfile(profile) {
  if (!profile) return profile;
  const out = { ...profile };
  for (const f of PROFILE_FIELDS) if (out[f] !== undefined) out[f] = encrypt(out[f]);
  return out;
}

export function decryptProfile(profile) {
  if (!profile) return profile;
  const out = { ...profile };
  for (const f of PROFILE_FIELDS) if (out[f] !== undefined) out[f] = decrypt(out[f]);
  return out;
}

/** Tasodifiy kalit yaratish (terminalda ko'rsatish uchun) */
export const generateKey = () => crypto.randomBytes(32).toString("hex");
