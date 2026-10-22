import MedicationReminder from "@/models/MedicationReminder";
import User from "@/models/User";
import { route, body } from "@/lib/http";
import { reminderSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { audit, ACTIONS } from "@/lib/audit";

const shape = (r) => ({
  id: r._id.toString(),
  patientId: r.patient?._id?.toString() || r.patient?.toString() || "",
  patientName: r.patient?.fullName || "",
  doctorName: r.doctor?.fullName || "",
  name: r.name,
  dose: r.dose || "",
  times: (r.times || []).slice().sort(),
  startDate: r.startDate || null,
  endDate: r.endDate || null,
  active: r.active !== false,
  createdAt: r.createdAt,
});

// Bemor -> o'z dori eslatmalari. Shifokor -> ?patient=<id> bo'yicha.
export const GET = route(async ({ req, session }) => {
  if (session.role === "patient") {
    const list = await MedicationReminder.find({ patient: session.sub, active: true })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("doctor", "fullName")
      .lean();
    return { reminders: list.map(shape) };
  }

  const patientId = new URL(req.url).searchParams.get("patient");
  if (!patientId || !objectId.safeParse(patientId).success)
    throw new ApiError("VALIDATION", "patient parametri kerak");
  if (session.role === "doctor") await assertDoctorLinkedToPatient(session.sub, patientId);

  const list = await MedicationReminder.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return { reminders: list.map(shape) };
});

// Shifokor bemorga dori eslatmasini belgilaydi
export const POST = route(
  async ({ req, session }) => {
    const d = await body(req, reminderSchema);
    await assertDoctorLinkedToPatient(session.sub, d.patientId);

    const patient = await User.findOne({ _id: d.patientId, role: "patient" }).select("_id");
    if (!patient) throw new ApiError("PATIENT_NOT_FOUND");

    const start = d.startDate ? new Date(d.startDate) : null;
    const end = d.endDate ? new Date(d.endDate) : null;
    if (start && Number.isNaN(start.getTime())) throw new ApiError("VALIDATION", "Sana noto'g'ri");
    if (end && Number.isNaN(end.getTime())) throw new ApiError("VALIDATION", "Sana noto'g'ri");
    if (start && end && end < start) throw new ApiError("VALIDATION", "Tugash sanasi boshlanishdan oldin");

    const rem = await MedicationReminder.create({
      patient: d.patientId,
      doctor: session.sub,
      name: d.name,
      dose: d.dose || "",
      times: [...new Set(d.times)].sort(),
      startDate: start || undefined,
      endDate: end || undefined,
    });

    await audit(session, ACTIONS.MED_REMINDER_CREATE, {
      targetType: "MedicationReminder", targetId: rem._id, targetName: d.name,
      meta: { patientId: d.patientId, times: rem.times },
    }, req);

    return Response.json({ reminder: shape(rem) }, { status: 201 });
  },
  { role: "doctor" }
);
