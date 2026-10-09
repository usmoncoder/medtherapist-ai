import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ApiError } from "./errors";
import { logger } from "./logger";

// Nisbiy yo'l berilsa ham absolyutga aylantiramiz — aks holda quyidagi
// "yo'ldan chiqib ketish" tekshiruvi noto'g'ri ishlaydi
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
export const MAX_FILE_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024); // 10 MB

// Faqat tibbiy hujjat va ovozli xabar uchun mantiqiy turlar —
// bajariladigan fayllar qabul qilinmaydi
export const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
  "text/plain",
  // Ovozli xabar: brauzerga qarab turli formatda yoziladi
  // (Chrome — webm/opus, Safari — mp4/aac)
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/wav",
]);

const EXT = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic",
  "application/pdf": ".pdf", "text/plain": ".txt",
  "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3", "audio/aac": ".aac", "audio/wav": ".wav",
};

/* MediaRecorder MIME turini kodek bilan beradi: `audio/webm;codecs=opus`.
   Ro'yxat bilan solishtirishdan oldin parametrlarni kesib tashlaymiz. */
export const baseMime = (type) => String(type || "").split(";")[0].trim().toLowerCase();

export async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") throw new ApiError("VALIDATION", "Fayl yo'q");
  if (file.size > MAX_FILE_BYTES) throw new ApiError("FILE_TOO_LARGE");
  const mime = baseMime(file.type);
  if (!ALLOWED_MIME.has(mime)) throw new ApiError("FILE_TYPE");

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const storageKey = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${EXT[mime] || ""}`;

  await ensureDir();
  await fs.writeFile(path.join(UPLOAD_DIR, storageKey), buf, { mode: 0o600 });
  logger.debug("fayl saqlandi", { storageKey, size: file.size });

  return {
    name: String(file.name || "fayl").slice(0, 200),
    mime,
    size: file.size,
    storageKey,
    sha256,
  };
}

export async function readFile(storageKey) {
  // Yo'lni chiqib ketishdan himoya
  const safe = path.basename(String(storageKey || ""));
  if (!safe || safe === "." || safe === "..") throw new ApiError("FILE_NOT_FOUND");
  const full = path.resolve(UPLOAD_DIR, safe);
  if (full !== path.join(UPLOAD_DIR, safe)) throw new ApiError("FILE_NOT_FOUND");
  return fs.readFile(full);
}

export async function deleteFile(storageKey) {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(storageKey)));
  } catch {}
}
