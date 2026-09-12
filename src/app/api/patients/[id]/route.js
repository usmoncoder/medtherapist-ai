import User from "@/models/User";
import Appointment from "@/models/Appointment";
import Analysis from "@/models/Analysis";
import { route, body } from "@/lib/http";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { objectId, patientMedicalSchema } from "@/lib/schemas";
import { audit, ACTIONS } from "@/lib/audit";
import { isAdmin } from "@/lib/roles";
import { notify } from "@/lib/notify";
import { encrypt, decryptProfile } from "@/lib/crypto";

// Bemor kartasi. Har bir ochilish audit jurnaliga yoziladi.
export const GET = route(
  async ({ params, session, req }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");

    const patient = await User.findOne({ _id: params.id, role: "patient" })
      .populate("assignedDoctor", "fullName doctorProfile.specialty")
      .lean();
    if (!patient) throw new ApiError("PATIENT_NOT_FOUND");

    const assigned = await assertDoctorLinkedToPatient(session.sub, params.id, session.role);

    const apptFilter = isAdmin(session.role)
      ? { patient: params.id }
      : { patient: params.id, doctor: session.sub };

    const [appointments, analyses] = await Promise.all([
      Appointment.find(apptFilter).sort({ startsAt: -1 }).limit(20).lean(),
      Analysis.find({ patient: params.id })
        .sort({ takenAt: -1 })
        .limit(50)
        .populate("attachments", "name mime size")
        .lean(),
    ]);

    await audit(session, ACTIONS.PATIENT_CARD_VIEW,
      { targetType: "User", targetId: patient._id, targetName: patient.fullName }, req);

    return {
      patient: {
        id: patient._id.toString(),
        fullName: patient.fullName,
        email: patient.email,
        assigned: isAdmin(session.role) ? true : assigned,
        assignedDoctorName: patient.assignedDoctor?.fullName || null,
        profile: decryptProfile(patient.patientProfile) || {},
      },
      appointments: appointments.map((a) => ({
        id: a._id.toString(),
        startsAt: a.startsAt,
        reason: a.reason || "",
        status: a.status,
      })),
      analyses: analyses.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        value: a.value,
        unit: a.unit || "",
        refRange: a.refRange || "",
        flag: a.flag || "norma",
        takenAt: a.takenAt,
        doctorComment: a.doctorComment || "",
        attachments: (a.attachments || []).map((x) => ({
          id: x._id.toString(), name: x.name, mime: x.mime, size: x.size,
        })),
      })),
    };
  },
  { role: ["doctor", "admin", "superadmin"] }
);

const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

/**
 * Bemorning TIBBIY ma'lumotini tahrirlash — faqat shifokor (va administrator).
 * Bemorning o'zi bu maydonlarni o'zgartira olmaydi.
 */
export const PATCH = route(
  async ({ req, params, session }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
    const d = await body(req, patientMedicalSchema);

    const patient = await User.findOne({ _id: params.id, role: "patient" });
    if (!patient) throw new ApiError("PATIENT_NOT_FOUND");
    await assertDoctorLinkedToPatient(session.sub, params.id, session.role);

    const base = patient.patientProfile?.toObject?.() ?? patient.patientProfile ?? {};
    const next = { ...base };
    for (const k of ["complaint", "history"]) if (d[k] !== undefined) next[k] = encrypt(d[k]);
    if (d.bloodType !== undefined) next.bloodType = d.bloodType;
    if (d.allergies !== undefined) next.allergies = toList(d.allergies);
    if (d.chronicConditions !== undefined) next.chronicConditions = toList(d.chronicConditions);
    patient.patientProfile = next;
    await patient.save();

    await audit(session, ACTIONS.PATIENT_MEDICAL_UPDATE, {
      targetType: "User", targetId: patient._id, targetName: patient.fullName,
      meta: { fields: Object.keys(d).join(",") },
    }, req);

    await notify(patient._id, {
      type: "analysis",
      titleKey: "notif.medicalUpdated",
      page: "profile",
      tone: "blue",
    });

    return { profile: decryptProfile(JSON.parse(JSON.stringify(patient.patientProfile))) };
  },
  { role: ["doctor", "admin", "superadmin"] }
);
