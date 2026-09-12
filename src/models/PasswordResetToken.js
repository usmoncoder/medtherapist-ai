import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true }, // sha256, xom token saqlanmaydi
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", tokenSchema);
