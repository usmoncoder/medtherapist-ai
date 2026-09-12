import { NextResponse } from "next/server";
import { ApiError, CODES } from "./errors";
import { logger } from "./logger";
import { dbConnect } from "./db";
import { requireSession } from "./session";
import { tokenValid } from "./tokenVersion";

export const ok = (data, status = 200) => NextResponse.json(data, { status });

export function fail(code, detail) {
  const [status, message] = CODES[code] || CODES.SERVER_ERROR;
  return NextResponse.json({ error: message, code, ...(detail ? { detail } : {}) }, { status });
}

/**
 * Har bir API route uchun o'ram: sessiya tekshiruvi, DB ulanishi va xatolarni ushlash.
 * handler({ req, params, session }) -> NextResponse | object
 */
/**
 * @param {object} opts
 * @param {string|string[]} [opts.role] talab qilingan rol yoki rollar ro'yxati
 */
export function route(handler, { role, auth = true, db = true } = {}) {
  return async (req, ctx) => {
    const started = Date.now();
    try {
      let session = null;
      if (auth) {
        const res = await requireSession(role);
        if (res.error) throw new ApiError(res.status === 403 ? "FORBIDDEN" : "AUTH_REQUIRED");
        session = res.session;
        // Parol o'zgargan yoki "hamma joydan chiqish" bosilgan bo'lsa, eski token yaroqsiz
        if (db && !(await tokenValid(session))) throw new ApiError("AUTH_REQUIRED");
      }
      if (db) await dbConnect();
      const params = ctx?.params ? await ctx.params : {};
      const out = await handler({ req, params, session });
      return out instanceof Response ? out : ok(out);
    } catch (e) {
      if (e instanceof ApiError) {
        logger.warn("api xatosi", { code: e.code, path: req.nextUrl?.pathname, detail: e.detail });
        return fail(e.code, e.detail);
      }
      logger.error("kutilmagan xato", {
        path: req.nextUrl?.pathname,
        message: e?.message,
        stack: process.env.NODE_ENV === "production" ? undefined : e?.stack,
      });
      return fail("SERVER_ERROR");
    } finally {
      logger.debug("api", { path: req.nextUrl?.pathname, ms: Date.now() - started });
    }
  };
}

/** zod schema bilan tanani tekshirish */
export async function body(req, schema) {
  let raw;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("VALIDATION", "JSON o'qib bo'lmadi");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError("VALIDATION", parsed.error.issues[0].message);
  return parsed.data;
}
