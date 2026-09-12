import mongoose from "mongoose";

// Bemor vaqt so'raydi -> shifokor tasdiqlaydi yoki rad etadi
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 30 },
    reason: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["kutilmoqda", "tasdiqlangan", "rad etilgan", "bekor qilingan", "yakunlangan"],
      default: "kutilmoqda",
    },
    doctorNote: { type: String, trim: true, maxlength: 1000 },
    decidedAt: Date,
    // Eslatma xabarnomasi yuborilgan vaqt (takroran yubormaslik uchun)
    reminderSentAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);
