import mongoose from "mongoose";

// Gemini qaytargan klinik tahlil natijasi
const aiReportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    input: {
      complaint: String,
      symptoms: [String],
      bp: String,
      pulse: String,
      temp: String,
      spo2: String,
      extra: String,
    },
    result: {
      summary: String,
      patientSummary: String,
      riskLevel: { type: String, enum: ["green", "yellow", "red"], default: "green" },
      riskReason: String,
      differentials: [{ name: String, confidence: Number, why: String, _id: false }],
      investigations: [String],
      management: [String],
      redFlags: [String],
    },
    model: String,
    lang: { type: String, enum: ["uz", "uzc", "ru"], default: "uz" },
  },
  { timestamps: true }
);

export default mongoose.models.AiReport || mongoose.model("AiReport", aiReportSchema);
