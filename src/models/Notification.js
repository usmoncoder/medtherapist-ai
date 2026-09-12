import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true }, // appointment | message | analysis | assignment | system
    // Matn tarjima kaliti va o'rin almashtiruvchilar bilan saqlanadi — til almashsa ham to'g'ri ko'rinadi
    titleKey: { type: String, required: true },
    vars: mongoose.Schema.Types.Mixed,
    page: String,    // klient qaysi bo'limga o'tishi kerak
    tone: { type: String, default: "purple" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
