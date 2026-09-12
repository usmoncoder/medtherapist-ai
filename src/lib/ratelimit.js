import { logger } from "./logger";

// Bitta instansda xotira yetarli; REDIS_URL berilsa Redis'ga o'tadi (bir nechta instans uchun)
const buckets = new Map();
let redis = null;
let redisTried = false;

const timer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}, 60_000);
timer.unref?.();

async function getRedis() {
  if (redisTried) return redis;
  redisTried = true;
  if (!process.env.REDIS_URL) return null;
  try {
    const { default: Redis } = await import("ioredis");
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });
    redis.on("error", (e) => logger.warn("redis xatosi", { message: e.message }));
    logger.info("rate limit Redis orqali ishlaydi");
  } catch (e) {
    logger.warn("Redis ulanmadi — xotiradagi limiter ishlatiladi", { message: e.message });
    redis = null;
  }
  return redis;
}

function memoryLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  b.count += 1;
  return { allowed: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

/** Sinxron chaqiruv — xotiradagi natijani darhol qaytaradi (Redis fon rejimida) */
export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  return memoryLimit(key, limit, windowMs);
}

/** Redis bo'lsa taqsimlangan hisob; bo'lmasa xotiradagi natija */
export async function rateLimitAsync(key, { limit = 10, windowMs = 60_000 } = {}) {
  const r = await getRedis();
  if (!r) return memoryLimit(key, limit, windowMs);
  try {
    const k = `rl:${key}`;
    const count = await r.incr(k);
    if (count === 1) await r.pexpire(k, windowMs);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

export function clientIp(req) {
  const h = req.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}
