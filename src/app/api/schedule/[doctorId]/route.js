import Schedule from "@/models/Schedule";
import Appointment from "@/models/Appointment";
import User from "@/models/User";
import { route } from "@/lib/http";
import { objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const pad = (n) => String(n).padStart(2, "0");
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/**
 * Berilgan sana uchun shifokorning bo'sh vaqtlari.
 * GET /api/schedule/<doctorId>?date=YYYY-MM-DD
 */
export const GET = route(async ({ req, params }) => {
  if (!objectId.safeParse(params.doctorId).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
  const date = new URL(req.url).searchParams.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new ApiError("VALIDATION", "Sana YYYY-MM-DD");

  const doctor = await User.findOne({ _id: params.doctorId, role: "doctor", isActive: true })
    .select("fullName").lean();
  if (!doctor) throw new ApiError("DOCTOR_NOT_FOUND");

  const schedule = await Schedule.findOne({ doctor: params.doctorId }).lean();
  if (!schedule || !schedule.workdays?.length) return { slots: [], reason: "SCHEDULE_MISSING" };
  if ((schedule.daysOff || []).includes(date)) return { slots: [], reason: "DAY_OFF" };

  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const weekday = dayStart.getDay();
  const windows = schedule.workdays.filter((w) => w.weekday === weekday);
  if (!windows.length) return { slots: [], reason: "DAY_OFF" };

  const step = schedule.slotMin || 30;
  const dayEnd = new Date(dayStart.getTime() + 864e5);

  // Band vaqtlar: tasdiqlangan va javob kutayotgan navbatlar
  const busy = await Appointment.find({
    doctor: params.doctorId,
    status: { $in: ["kutilmoqda", "tasdiqlangan"] },
    startsAt: { $gte: dayStart, $lt: dayEnd },
  }).select("startsAt durationMin status").lean();

  const busyRanges = busy.map((b) => {
    const s = new Date(b.startsAt);
    const from = s.getHours() * 60 + s.getMinutes();
    return { from, to: from + (b.durationMin || step), status: b.status };
  });

  const now = new Date();
  const slots = [];
  for (const w of windows) {
    for (let t = toMin(w.from); t + step <= toMin(w.to); t += step) {
      const start = new Date(y, m - 1, d, Math.floor(t / 60), t % 60, 0, 0);
      if (start <= now) continue;
      const clash = busyRanges.find((b) => t < b.to && t + step > b.from);
      slots.push({
        time: fromMin(t),
        iso: `${date}T${fromMin(t)}:00`,
        available: !clash,
        status: clash?.status || null,
      });
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time));
  return { slots, slotMin: step, doctorName: doctor.fullName };
});
