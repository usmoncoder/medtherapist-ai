import mongoose from "mongoose";

// Yuklangan fayl metama'lumoti. Faylning o'zi diskda (UPLOAD_DIR) saqlanadi.
const attachmentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true }, // diskdagi fayl nomi
    context: { type: String, enum: ["message", "analysis"], required: true },
    sha256: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Attachment || mongoose.model("Attachment", attachmentSchema);
