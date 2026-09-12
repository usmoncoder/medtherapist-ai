import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/jwt";

const PUBLIC = ["/login", "/register", "/forgot", "/reset"];

const home = (role) =>
  role === "doctor" ? "/shifokor" : role === "patient" ? "/bemor" : "/admin";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  // 2FA kutayotgan yarim sessiya to'liq hisoblanmaydi
  const active = session && !session.pending2fa ? session : null;

  if (PUBLIC.includes(pathname)) {
    if (active) return NextResponse.redirect(new URL(home(active.role), req.url));
    return NextResponse.next();
  }

  if (!active) return NextResponse.redirect(new URL("/login", req.url));

  // Rol bo'yicha himoya
  if (pathname.startsWith("/shifokor") && active.role !== "doctor")
    return NextResponse.redirect(new URL(home(active.role), req.url));
  if (pathname.startsWith("/bemor") && active.role !== "patient")
    return NextResponse.redirect(new URL(home(active.role), req.url));
  if (pathname.startsWith("/admin") && !["admin", "superadmin"].includes(active.role))
    return NextResponse.redirect(new URL(home(active.role), req.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/bemor/:path*",
    "/shifokor/:path*",
    "/admin/:path*",
  ],
};
