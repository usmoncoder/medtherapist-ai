// Next.js + Socket.io bitta portda
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { parse: parseCookie } = require("cookie");
const { jwtVerify } = require("jose");
const mongoose = require("mongoose");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`[fatal] ${key} .env faylda ko'rsatilmagan`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("[fatal] JWT_SECRET kamida 32 belgi bo'lishi kerak");
  process.exit(1);
}

const app = next({ dev });
const handle = app.getRequestHandler();
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function main() {
  await app.prepare();
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
    serverSelectionTimeoutMS: 10_000,
  });
  // API route'lar bilan bitta ulanishdan foydalanamiz
  global._mongoose = { conn: mongoose, promise: Promise.resolve(mongoose) };

  const server = createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error("[http] so'rovni bajarishda xato:", e);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  const io = new Server(server, {
    path: "/socket.io",
    serveClient: false,
    pingTimeout: 25_000,
    cors: dev ? { origin: true, credentials: true } : undefined,
  });
  global._io = io;

  // Cookie'dagi JWT bilan socket autentifikatsiyasi
  io.use(async (socket, nextFn) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || "");
      if (!cookies.mt_token) return nextFn(new Error("unauthorized"));
      const { payload } = await jwtVerify(cookies.mt_token, secret);
      socket.user = payload;
      nextFn();
    } catch {
      nextFn(new Error("unauthorized"));
    }
  });

  const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

  io.on("connection", (socket) => {
    // Har bir foydalanuvchi shaxsiy xonasida — xabarnomalar shu orqali keladi
    socket.join(`user:${socket.user.sub}`);
    if (socket.user.role) socket.join(`role:${socket.user.role}`);

    // Faqat o'zi a'zo bo'lgan chat xonasiga kira oladi
    socket.on("conversation:join", async (conversationId) => {
      try {
        if (!isObjectId(conversationId)) return;
        const conv = await mongoose.connection
          .collection("conversations")
          .findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
        if (!conv) return;
        const uid = socket.user.sub;
        if (conv.patient.toString() !== uid && conv.doctor.toString() !== uid) return;
        socket.join(`conv:${conversationId}`);
      } catch (e) {
        console.error("[socket] join xatosi:", e.message);
      }
    });

    socket.on("conversation:leave", (id) => {
      if (isObjectId(id)) socket.leave(`conv:${id}`);
    });

    socket.on("typing", ({ conversationId } = {}) => {
      if (!isObjectId(conversationId)) return;
      if (!socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit("typing", { userId: socket.user.sub });
    });
  });

  /* ---------------- Navbat eslatmalari ----------------
     Har 10 daqiqada 24 soatdan keyin boshlanadigan tasdiqlangan navbatlarni
     topib, bemorga bir marta eslatma yuboradi. */
  const REMINDER_EVERY_MS = Number(process.env.REMINDER_INTERVAL_MS || 10 * 60_000);

  async function sendReminders() {
    try {
      const appts = mongoose.connection.collection("appointments");
      const notifs = mongoose.connection.collection("notifications");
      const now = Date.now();
      const due = await appts
        .find({
          status: "tasdiqlangan",
          reminderSentAt: null,
          startsAt: { $gte: new Date(now + 23 * 3600_000), $lte: new Date(now + 25 * 3600_000) },
        })
        .limit(200)
        .toArray();

      for (const a of due) {
        const doc = {
          user: a.patient,
          type: "appointment",
          titleKey: "notif.apptReminder",
          vars: { when: new Date(a.startsAt).toISOString() },
          page: "queue",
          tone: "amber",
          read: false,
          createdAt: new Date(),
        };
        const { insertedId } = await notifs.insertOne(doc);
        await appts.updateOne({ _id: a._id }, { $set: { reminderSentAt: new Date() } });
        io.to(`user:${a.patient.toString()}`).emit("notification:new", {
          ...doc,
          id: insertedId.toString(),
          user: undefined,
        });
      }
      if (due.length) console.log(`[eslatma] ${due.length} ta bemorga navbat eslatmasi yuborildi`);
    } catch (e) {
      console.error("[eslatma] xato:", e.message);
    }
  }

  const reminderTimer = setInterval(sendReminders, REMINDER_EVERY_MS);
  reminderTimer.unref?.();
  setTimeout(sendReminders, 15_000); // ishga tushgach bir marta

  server.listen(port, host, () =>
    console.log(`> MedTherapist AI: http://localhost:${port} (${dev ? "dev" : "production"})`)
  );

  // Toza to'xtash — ochiq ulanishlarni yopamiz
  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`\n[${signal}] to'xtatilmoqda…`);
    clearInterval(reminderTimer);
    io.close();
    server.close();
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
  process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));
}

main().catch((e) => {
  console.error("[fatal] server ishga tushmadi:", e);
  process.exit(1);
});
