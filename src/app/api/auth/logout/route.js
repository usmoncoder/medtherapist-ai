import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import { audit, ACTIONS } from "@/lib/audit";

export async function POST(req) {
  try {
    const s = await getSession();
    if (s) {
      await dbConnect();
      await audit(s, ACTIONS.LOGOUT, {}, req);
    }
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
