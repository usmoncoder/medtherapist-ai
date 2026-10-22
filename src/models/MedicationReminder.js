import mongoose from "mongoose";

// Dori ichish eslatmasi: shifokor bemorga belgilaydi, server belgilangan
// vaqtlarda bemorga xabarnoma yuboradi.
const medicationReminderSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    dose: String,
    times: [String], // kunlik vaqtlar, "HH:MM" (24 soat)
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true, index: true },
    // Har bir vaqt uchun eslatma oxirgi marta qaysi kuni yuborilgani:
    // { "08:00": "2026-10-22" } — bir kunda ikki marta yubormaslik uchun
    lastSent: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.MedicationReminder ||
  mongoose.model("MedicationReminder", medicationReminderSchema);
