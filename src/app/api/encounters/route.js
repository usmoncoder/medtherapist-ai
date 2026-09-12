import Encounter from "@/models/Encounter";
import Appointment from "@/models/Appointment";
import { route, body } from "@/lib/http";
import { encounterSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { encrypt, decrypt } from "@/lib/crypto";

const TEXT = ["subjective", "objective", "assessment", "plan"];

const shape = (e) => {
  const out = {
    id: e._id.toString(),
    appointment: e.appointment?.toString() || null,
    doctorName: e.doctor?.fullName || "",
    patientName: e.patient?.fullName || "",
    vitals: e.vitals || {},
    prescriptions: e.prescriptions || [],
    followUpAt: e.followUpAt || null,
    createdAt: e.createdAt,
  };
  for (const f of TEXT) out[f] = decrypt(e[f] || "");
  return out;
};

// Bemor -> o'z xulosalari. Shifokor/admin -> ?patient=<id>
export const GET = route(async ({ req, session }) => {
  let patientId = session.sub;
  if (session.role !== "patient") {
    patientId = new URL(req.url).searchParams.get("patient");
    if (!patientId || !objectId.safeParse(patientId).success)
      throw new ApiError("VALIDATION", "patient parametri kerak");
    if (session.role === "doctor") await assertDoctorLinkedToPatient(session.sub, patientId);
  }
  const list = await Encounter.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("doctor", "fullName")
    .lean();
  return { encounters: list.map(shape) };
});

// Shifokor qabul xulosasini yozadi
export const POST = route(
  async ({ req, session }) => {
    const d = await body(req, encounterSchema);
    await assertDoctorLinkedToPatient(session.sub, d.patientId);

    let appointment = null;
    if (d.appointmentId) {
      appointment = await Appointment.findById(d.appointmentId);
      if (!appointment) throw new ApiError("APPT_NOT_FOUND");
      if (appointment.doctor.toString() !== session.sub) throw new ApiError("FORBIDDEN");
      if (appointment.patient.toString() !== d.patientId) throw new ApiError("VALIDATION", "Navbat boshqa bemorga tegishli");
    }

    const doc = {
      appointment: d.appointmentId || null,
      patient: d.patientId,
      doctor: session.sub,
      vitals: d.vitals || {},
      prescriptions: d.prescriptions || [],
      followUpAt: d.followUpAt ? new Date(d.followUpAt) : undefined,
    };
    for (const f of TEXT) doc[f] = encrypt(d[f] || "");

    const enc = await Encounter.create(doc);

    // Qabul xulosasi yozilgach navbat avtomatik yakunlanadi
    if (appointment && appointment.status === "tasdiqlangan") {
      appointment.status = "yakunlangan";
      appointment.decidedAt = new Date();
      await appointment.save();
    }

    await audit(session, ACTIONS.ENCOUNTER_CREATE, {
      targetType: "Encounter", targetId: enc._id, meta: { patientId: d.patientId },
    }, req);

    await notify(d.patientId, {
      type: "analysis",
      titleKey: "notif.encounterReady",
      page: "timeline",
      tone: "green",
    });

    return Response.json({ encounter: shape(enc) }, { status: 201 });
  },
  { role: "doctor" }
);
