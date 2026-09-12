import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

/**
 * Yaroqsiz sessiyani tozalab kirish sahifasiga qaytaradi.
 * Server sahifalari (`loadPageUser`) shu yerga yo'naltiradi — cookie o'chmasa
 * middleware bilan cheksiz qayta yo'naltirish halqasi paydo bo'ladi.
 */
export function GET(req) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
