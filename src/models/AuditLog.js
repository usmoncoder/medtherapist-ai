import mongoose from "mongoose";

// Tibbiy tizim uchun majburiy: kim, qachon, qaysi ma'lumotga tegdi
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true },
    targetType: String,   // User | Appointment | Analysis | Conversation | System
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    targetName: String,
    meta: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
// 2 yildan keyin avtomatik o'chadi (saqlash muddati siyosati)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
