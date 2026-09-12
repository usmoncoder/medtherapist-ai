import mongoose from "mongoose";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import Attachment from "@/models/Attachment";
import AiReport from "@/models/AiReport";
import Notification from "@/models/Notification";
import { route } from "@/lib/http";
import { geminiConfigured, geminiModel } from "@/lib/gemini";
import { mailerConfigured } from "@/lib/mailer";
import { encryptionEnabled } from "@/lib/crypto";
import ClientError from "@/models/ClientError";

export const dynamic = "force-dynamic";

// Bu sahifa nazorat paneli — har bosishda 17 ta so'rov yubormaslik uchun
// natijani qisqa muddat keshda saqlaymiz.
const TTL_MS = 15_000;
let cache = { at: 0, data: null };

/**
 * Tizim holati — FAQAT bosh administrator uchun.
 * Maxfiy qiymatlar (kalitlar, parollar) hech qachon qaytarilmaydi, faqat "sozlangan/yo'q".
 */
export const GET = route(
  async ({ req }) => {
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    if (!fresh && cache.data && Date.now() - cache.at < TTL_MS) return cache.data;

    const conn = mongoose.connection;
    const collections = await conn.db.listCollections().toArray();
    const dayAgo = new Date(Date.now() - 864e5);

    // Kolleksiya hajmlari uchun estimatedDocumentCount — metama'lumotdan oladi, deyarli oniy.
    // Aniq son kerak bo'lgan ko'rsatkichlargina countDocuments bilan sanaladi.
    const [countPairs, twoFactorOn, inactive, unverifiedDoctors, storage, auditDay, aiTotal, notifUnread, clientErrors] =
      await Promise.all([
        Promise.all(
          collections.map(async (c) => [c.name, await conn.collection(c.name).estimatedDocumentCount()])
        ),
        User.countDocuments({ "twoFactor.enabled": true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: "doctor", "doctorProfile.isVerified": { $ne: true } }),
        Attachment.aggregate([{ $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: "$size" } } }]),
        AuditLog.countDocuments({ createdAt: { $gte: dayAgo } }),
        AiReport.estimatedDocumentCount(),
        Notification.countDocuments({ read: false }),
        ClientError.countDocuments({ createdAt: { $gte: dayAgo } }),
      ]);

    const counts = Object.fromEntries(countPairs);

    const payload = {
      db: {
        status: conn.readyState === 1 ? "up" : "down",
        name: conn.name,
        host: conn.host,
        collections: counts,
      },
      services: {
        ai: geminiConfigured() ? { on: true, model: geminiModel() } : { on: false },
        mailer: { on: mailerConfigured() },
        redis: { on: Boolean(process.env.REDIS_URL) },
        encryption: { on: encryptionEnabled() },
        realtime: { on: Boolean(global._io) },
      },
      runtime: {
        node: process.version,
        env: process.env.NODE_ENV || "development",
        uptimeSec: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      },
      security: {
        twoFactorOn,
        inactive,
        unverifiedDoctors,
        auditLast24h: auditDay,
        clientErrors24h: clientErrors,
      },
      usage: {
        aiReports: aiTotal,
        unreadNotifications: notifUnread,
        files: storage[0]?.n || 0,
        fileBytes: storage[0]?.bytes || 0,
      },
      cachedAt: new Date().toISOString(),
    };

    cache = { at: Date.now(), data: payload };
    return payload;
  },
  { role: "superadmin" }
);
