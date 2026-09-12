import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { route, body } from "@/lib/http";
import { assignSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";

// Administrator bemorni shifokorga biriktiradi (yoki biriktiruvni bekor qiladi)
export const POST = route(
  async ({ req, session }) => {
    const { patientId, doctorId } = await body(req, assignSchema);

    const patient = await User.findOne({ _id: patientId, role: "patient" });
    if (!patient) throw new ApiError("PATIENT_NOT_FOUND");

    if (!doctorId) {
      const prev = patient.assignedDoctor;
      patient.assignedDoctor = null;
      patient.assignedBy = session.sub;
      patient.assignedAt = new Date();
      await patient.save();
      await audit(session, ACTIONS.PATIENT_UNASSIGN,
        { targetType: "User", targetId: patient._id, targetName: patient.fullName, meta: { prevDoctor: prev } }, req);
      return { ok: true, assignedDoctor: null };
    }

    const doctor = await User.findOne({ _id: doctorId, role: "doctor", isActive: true });
    if (!doctor) throw new ApiError("DOCTOR_NOT_FOUND");

    patient.assignedDoctor = doctor._id;
    patient.assignedBy = session.sub;
    patient.assignedAt = new Date();
    await patient.save();

    // Biriktirilgan zahoti suhbat ochiladi
    await Conversation.findOneAndUpdate(
      { patient: patient._id, doctor: doctor._id },
      { $setOnInsert: { patient: patient._id, doctor: doctor._id } },
      { upsert: true }
    );

    await audit(session, ACTIONS.PATIENT_ASSIGN, {
      targetType: "User",
      targetId: patient._id,
      targetName: patient.fullName,
      meta: { doctorId: doctor._id.toString(), doctorName: doctor.fullName },
    }, req);

    await notify(patient._id, {
      type: "assignment",
      titleKey: "notif.doctorAssigned",
      vars: { name: doctor.fullName },
      page: "doctor",
      tone: "green",
    });
    await notify(doctor._id, {
      type: "assignment",
      titleKey: "notif.patientAssigned",
      vars: { name: patient.fullName },
      page: "patients",
      tone: "blue",
    });

    return { ok: true, assignedDoctor: doctor._id.toString(), doctorName: doctor.fullName };
  },
  { role: ["admin", "superadmin"] }
);
