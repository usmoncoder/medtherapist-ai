import ClientError from "@/models/ClientError";
import { route, body } from "@/lib/http";
import { clientErrorSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { rateLimitAsync, clientIp } from "@/lib/ratelimit";
import { getSession } from "@/lib/session";

// Brauzerdagi xatoni qayd etish. Sessiya shart emas — kirish sahifasidagi xatolar ham kerak.
export const POST = route(
  async ({ req }) => {
    if (!(await rateLimitAsync(`cerr:${clientIp(req)}`, { limit: 20, windowMs: 10 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const d = await body(req, clientErrorSchema);
    const session = await getSession().catch(() => null);

    // Bir xil xato takrorlansa yangi yozuv emas, hisobni oshiramiz
    const existing = await ClientError.findOne({ message: d.message, page: d.page || "" });
    if (existing) {
      existing.count += 1;
      existing.lastAt = new Date();
      await existing.save();
      return { ok: true, deduped: true };
    }

    await ClientError.create({
      user: session?.sub || null,
      role: session?.role || "anon",
      message: d.message,
      stack: d.stack,
      page: d.page || "",
      userAgent: req.headers.get("user-agent")?.slice(0, 200),
    });
    return { ok: true };
  },
  { auth: false }
);

// Bosh administrator uchun ro'yxat
export const GET = route(
  async () => {
    const list = await ClientError.find({}).sort({ lastAt: -1 }).limit(50).lean();
    return {
      errors: list.map((e) => ({
        id: e._id.toString(),
        message: e.message,
        page: e.page,
        role: e.role,
        count: e.count,
        lastAt: e.lastAt,
        stack: (e.stack || "").split("\n").slice(0, 3).join("\n"),
      })),
    };
  },
  { role: "superadmin" }
);
