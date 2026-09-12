import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";
import { route } from "@/lib/http";
import { bumpTokenVersion } from "@/lib/tokenVersion";
import { audit, ACTIONS } from "@/lib/audit";

// Barcha qurilmalardan chiqish — mavjud JWT'larning hammasi yaroqsiz bo'ladi
export const POST = route(async ({ session, req }) => {
  await bumpTokenVersion(session.sub);
  await audit(session, ACTIONS.LOGOUT_ALL, { targetType: "User", targetId: session.sub }, req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
