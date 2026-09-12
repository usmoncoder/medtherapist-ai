import mongoose from "mongoose";

// Har bir bemor–shifokor juftligi uchun bitta chat
const conversationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { text: String, at: Date, from: mongoose.Schema.Types.ObjectId },
    unread: {
      patient: { type: Number, default: 0 },
      doctor: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ patient: 1, doctor: 1 }, { unique: true });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
