import mongoose from "mongoose";

// Brauzerda yuz bergan xatolar — bosh administrator ko'radi
const clientErrorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: String,
    message: { type: String, required: true, maxlength: 500 },
    stack: { type: String, maxlength: 4000 },
    page: String,
    userAgent: String,
    count: { type: Number, default: 1 },
    lastAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

clientErrorSchema.index({ message: 1, page: 1 });
clientErrorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.models.ClientError || mongoose.model("ClientError", clientErrorSchema);
