import mongoose from "mongoose";

// Analiz ko'rsatkichini FAQAT shifokor kiritadi — bemor uni ko'radi
const analysisSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    refRange: { type: String, trim: true },
    // norma | yuqori | past | kritik — shifokor belgilaydi
    flag: { type: String, enum: ["norma", "yuqori", "past", "kritik"], default: "norma" },
    takenAt: { type: Date, default: Date.now },
    doctorComment: { type: String, trim: true, maxlength: 2000 },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }],
  },
  { timestamps: true }
);

analysisSchema.index({ patient: 1, takenAt: -1 });

export default mongoose.models.Analysis || mongoose.model("Analysis", analysisSchema);
