import mongoose from "mongoose";

// Qabul xulosasi — SOAP tuzilmasi (Subjective / Objective / Assessment / Plan)
const encounterSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    subjective: { type: String, trim: true, maxlength: 4000 },  // bemor so'zlari, shikoyat
    objective: { type: String, trim: true, maxlength: 4000 },   // ko'rik natijasi, o'lchovlar
    assessment: { type: String, trim: true, maxlength: 2000 },  // xulosa / tashxis
    plan: { type: String, trim: true, maxlength: 4000 },        // tayinlov va tavsiyalar

    vitals: {
      bp: String,
      pulse: String,
      temp: String,
      spo2: String,
      weight: String,
      _id: false,
    },
    prescriptions: [
      { name: String, dose: String, duration: String, note: String, _id: false },
    ],
    followUpAt: Date,
  },
  { timestamps: true }
);

encounterSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.models.Encounter || mongoose.model("Encounter", encounterSchema);
