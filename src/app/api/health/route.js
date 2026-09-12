import mongoose from "mongoose";
import { ok } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { geminiConfigured, geminiModel } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// Monitoring uchun — sessiya talab qilmaydi, maxfiy ma'lumot qaytarmaydi
export async function GET() {
  let db = "down";
  try {
    await dbConnect();
    db = mongoose.connection.readyState === 1 ? "up" : "connecting";
  } catch {
    db = "down";
  }
  return ok(
    {
      status: db === "up" ? "ok" : "degraded",
      db,
      ai: geminiConfigured() ? geminiModel() : "sozlanmagan",
      uptimeSec: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    db === "up" ? 200 : 503
  );
}
