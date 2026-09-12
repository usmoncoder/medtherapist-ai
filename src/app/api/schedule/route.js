import Schedule from "@/models/Schedule";
import { route, body } from "@/lib/http";
import { scheduleSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { audit, ACTIONS } from "@/lib/audit";

const DEFAULT_DAYS = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, from: "09:00", to: "17:00" }));

const shape = (s) => ({
  slotMin: s?.slotMin || 30,
  workdays: (s?.workdays || []).map((w) => ({ weekday: w.weekday, from: w.from, to: w.to })),
  daysOff: s?.daysOff || [],
});

// Shifokorning o'z jadvali
export const GET = route(
  async ({ session }) => {
    const s = await Schedule.findOne({ doctor: session.sub }).lean();
    return { schedule: s ? shape(s) : { slotMin: 30, workdays: DEFAULT_DAYS, daysOff: [] }, exists: Boolean(s) };
  },
  { role: "doctor" }
);

export const PUT = route(
  async ({ req, session }) => {
    const d = await body(req, scheduleSchema);
    for (const w of d.workdays) {
      if (w.from >= w.to) throw new ApiError("VALIDATION", "Boshlanish vaqti tugash vaqtidan oldin bo'lsin");
    }
    const s = await Schedule.findOneAndUpdate(
      { doctor: session.sub },
      { $set: { slotMin: d.slotMin || 30, workdays: d.workdays, daysOff: d.daysOff || [] } },
      { upsert: true, new: true }
    );
    await audit(session, ACTIONS.SCHEDULE_UPDATE, { targetType: "Schedule", targetId: s._id }, req);
    return { schedule: shape(s) };
  },
  { role: "doctor" }
);
