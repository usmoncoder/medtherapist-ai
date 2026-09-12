import Appointment from "@/models/Appointment";
import User from "@/models/User";
import Schedule from "@/models/Schedule";
import Conversation from "@/models/Conversation";
import { route, body } from "@/lib/http";
import { createAppointmentSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { rateLimitAsync } from "@/lib/ratelimit";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { isAdmin } from "@/lib/roles";

const MAX_AHEAD_DAYS = 90;

const shape = (a, role) => ({
  id: a._id.toString(),
  startsAt: a.startsAt,
  durationMin: a.durationMin,
  reason: a.reason || "",
  status: a.status,
  doctorNote: a.doctorNote || "",
  patientName: a.patient?.fullName || "—",
  doctorName: a.doctor?.fullName || "—",
  peer:
    role === "patient"
      ? {
          id: a.doctor?._id?.toString() || "",
          fullName: a.doctor?.fullName || "—",
          subtitle: a.doctor?.doctorProfile?.specialty || "",
        }
      : { id: a.patient?._id?.toString() || "", fullName: a.patient?.fullName || "—" },
});

export const GET = route(async ({ session }) => {
  const filter =
    session.role === "doctor"
      ? { doctor: session.sub }
      : session.role === "patient"
      ? { patient: session.sub }
      : {}; // admin — hammasi

  const list = await Appointment.find(filter)
    .sort({ startsAt: 1 })
    .limit(500)
    .populate("patient", "fullName")
    .populate("doctor", "fullName doctorProfile.specialty");
  return { appointments: list.map((a) => shape(a, session.role)) };
});

// Bemor navbat so'raydi — vaqt shifokor jadvalidan tanlanadi
export const POST = route(
  async ({ req, session }) => {
    if (!(await rateLimitAsync(`appt:${session.sub}`, { limit: 20, windowMs: 60 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const { startsAt, reason, doctorId, durationMin } = await body(req, createAppointmentSchema);
    const when = new Date(startsAt);
    if (Number.isNaN(when.getTime())) throw new ApiError("VALIDATION", "Sana noto'g'ri");
    if (when.getTime() < Date.now()) throw new ApiError("APPT_PAST");
    if (when.getTime() > Date.now() + MAX_AHEAD_DAYS * 864e5) throw new ApiError("APPT_TOO_FAR");

    const me = await User.findById(session.sub);
    // Bemor faqat o'ziga biriktirilgan shifokorga yozila oladi
    const target = me.assignedDoctor;
    if (!target) throw new ApiError("NO_DOCTOR_ASSIGNED");
    if (doctorId && doctorId !== target.toString()) throw new ApiError("FORBIDDEN");

    const doctor = await User.findOne({ _id: target, role: "doctor", isActive: true });
    if (!doctor) throw new ApiError("DOCTOR_NOT_FOUND");

    const schedule = await Schedule.findOne({ doctor: doctor._id }).lean();
    if (!schedule || !schedule.workdays?.length) throw new ApiError("SCHEDULE_MISSING");

    const step = schedule.slotMin || 30;
    const duration = durationMin || step;

    // Tanlangan vaqt jadvaldagi haqiqiy slotga to'g'ri kelishi shart
    const dateKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
    if ((schedule.daysOff || []).includes(dateKey)) throw new ApiError("SLOT_UNAVAILABLE");

    const minutes = when.getHours() * 60 + when.getMinutes();
    const toMin = (s) => Number(s.split(":")[0]) * 60 + Number(s.split(":")[1]);
    const inWindow = schedule.workdays.some(
      (w) =>
        w.weekday === when.getDay() &&
        minutes >= toMin(w.from) &&
        minutes + step <= toMin(w.to) &&
        (minutes - toMin(w.from)) % step === 0
    );
    if (!inWindow) throw new ApiError("SLOT_UNAVAILABLE");

    const from = new Date(when.getTime() - duration * 60_000 + 1);
    const to = new Date(when.getTime() + duration * 60_000 - 1);
    const clash = await Appointment.findOne({
      doctor: doctor._id,
      status: { $in: ["kutilmoqda", "tasdiqlangan"] },
      startsAt: { $gt: from, $lt: to },
    });
    if (clash) {
      throw new ApiError(
        clash.patient.toString() === me._id.toString() ? "APPT_DUPLICATE" : "APPT_SLOT_TAKEN"
      );
    }

    const appt = await Appointment.create({
      patient: me._id,
      doctor: doctor._id,
      startsAt: when,
      durationMin: duration,
      reason,
    });

    await Conversation.findOneAndUpdate(
      { patient: me._id, doctor: doctor._id },
      { $setOnInsert: { patient: me._id, doctor: doctor._id } },
      { upsert: true }
    );

    await audit(session, ACTIONS.APPOINTMENT_CREATE,
      { targetType: "Appointment", targetId: appt._id, meta: { doctorId: doctor._id.toString() } }, req);

    await notify(doctor._id, {
      type: "appointment",
      titleKey: "notif.newRequest",
      vars: { name: me.fullName },
      page: "appointments",
      tone: "amber",
    });

    return Response.json({ id: appt._id.toString() }, { status: 201 });
  },
  { role: "patient" }
);
