import mongoose from "mongoose";
import { logger } from "./logger";
// Barcha sxemalar ro'yxatdan o'tsin — populate() ishlashi uchun shart
import "@/models/registry";

// Dev'da hot-reload har safar yangi ulanish ochmasligi uchun global keshda saqlaymiz
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

const OPTIONS = {
  bufferCommands: false,
  maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  family: 4,
};

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI .env faylda ko'rsatilmagan");

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(uri, OPTIONS)
      .then((m) => {
        logger.info("mongodb ulandi", { db: m.connection.name });
        return m;
      })
      .catch((e) => {
        cached.promise = null; // keyingi so'rovda qayta urinish uchun
        logger.error("mongodb ulanmadi", { message: e.message });
        throw e;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function dbDisconnect() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
