import Appointment from "@/models/Appointment";
import { route, body } from "@/lib/http";
import { updateAppointmentSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { isAdmin } from "@/lib/roles";

const DOCTOR_CAN = ["tasdiqlangan", "rad etilgan", "yakunlangan"];
const PATIENT_CAN = ["bekor qilingan"];
const FINAL = ["rad etilgan", "bekor qilingan", "yakunlangan"];

export const PATCH = route(async ({ req, params, session }) => {
  if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
  const { status: next, doctorNote } = await body(req, updateAppointmentSchema);

  const appt = await Appointment.findById(params.id);
  if (!appt) throw new ApiError("APPT_NOT_FOUND");

  const isDoctor = appt.doctor.toString() === session.sub;
  const isPatient = appt.patient.toString() === session.sub;
  const admin = isAdmin(session.role);
  if (!isDoctor && !isPatient && !admin) throw new ApiError("FORBIDDEN");

  const allowed = isDoctor || admin ? DOCTOR_CAN.concat(admin ? PATIENT_CAN : []) : PATIENT_CAN;
  if (!allowed.includes(next)) throw new ApiError("APPT_STATUS_NOT_ALLOWED");
  if (FINAL.includes(appt.status)) throw new ApiError("APPT_STATUS_NOT_ALLOWED");

  // Tasdiqlashda vaqt bandligini yana tekshiramiz (poyga holatiga qarshi)
  if (next === "tasdiqlangan") {
    const d = appt.durationMin || 30;
    const clash = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctor: appt.doctor,
      status: "tasdiqlangan",
      startsAt: {
        $gt: new Date(appt.startsAt.getTime() - d * 60_000 + 1),
        $lt: new Date(appt.startsAt.getTime() + d * 60_000 - 1),
      },
    });
    if (clash) throw new ApiError("APPT_SLOT_TAKEN");
  }

  appt.status = next;
  appt.decidedAt = new Date();
  if ((isDoctor || admin) && doctorNote !== undefined) appt.doctorNote = doctorNote;
  await appt.save();

  await audit(session, ACTIONS.APPOINTMENT_DECIDE,
    { targetType: "Appointment", targetId: appt._id, meta: { status: next } }, req);

  // Qarama-qarshi tomonga xabar
  const notifyUser = isPatient ? appt.doctor : appt.patient;
  await notify(notifyUser, {
    type: "appointment",
    titleKey: "notif.apptStatusChanged",
    vars: { status: next },
    page: isPatient ? "appointments" : "queue",
    tone: next === "tasdiqlangan" ? "green" : next === "rad etilgan" ? "red" : "purple",
  });

  return { ok: true, status: appt.status };
});
