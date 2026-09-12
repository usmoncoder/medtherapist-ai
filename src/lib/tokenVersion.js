import User from "@/models/User";

/**
 * "Barcha qurilmalardan chiqish": foydalanuvchining tokenVersion raqami oshsa,
 * eski JWT'lar avtomatik yaroqsiz bo'ladi.
 * Har bir so'rovda bazaga bormaslik uchun qiymat 60 soniya keshlanadi.
 */
const TTL_MS = 60_000;
const cache = new Map(); // userId -> { v, at }

export function invalidateCache(userId) {
  cache.delete(String(userId));
}

export async function currentVersion(userId) {
  const id = String(userId);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.v;
  const u = await User.findById(id).select("tokenVersion isActive").lean();
  const v = u ? { v: u.tokenVersion || 0, active: u.isActive !== false } : { v: -1, active: false };
  cache.set(id, { v, at: Date.now() });
  return v;
}

/** Token hali ham amal qiladimi (versiya mos va hisob faol) */
export async function tokenValid(session) {
  if (!session?.sub) return false;
  const { v, active } = await currentVersion(session.sub);
  if (!active) return false;
  return (session.tv || 0) === v;
}

export async function bumpTokenVersion(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  invalidateCache(userId);
}
