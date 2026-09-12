import mongoose from "mongoose";

// Shifokorning haftalik ish vaqti. weekday: 0=yakshanba ... 6=shanba
const slotSchema = new mongoose.Schema(
  { weekday: { type: Number, min: 0, max: 6 }, from: String, to: String, _id: false },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    slotMin: { type: Number, default: 30, min: 10, max: 120 },
    workdays: [slotSchema],
    // Dam olish / ta'til kunlari (YYYY-MM-DD)
    daysOff: [String],
  },
  { timestamps: true }
);

export default mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);
