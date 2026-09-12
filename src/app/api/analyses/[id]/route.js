import Analysis from "@/models/Analysis";
import { route, body } from "@/lib/http";
import { updateAnalysisSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";

// Shifokor izoh/bayroq/qiymatni tahrirlaydi
export const PATCH = route(
  async ({ req, params, session }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
    const d = await body(req, updateAnalysisSchema);

    const a = await Analysis.findById(params.id);
    if (!a) throw new ApiError("ANALYSIS_NOT_FOUND");
    await assertDoctorLinkedToPatient(session.sub, a.patient);

    if (d.doctorComment !== undefined) a.doctorComment = d.doctorComment;
    if (d.flag !== undefined) a.flag = d.flag;
    if (d.value !== undefined && d.value) a.value = d.value;
    await a.save();

    await audit(session, ACTIONS.ANALYSIS_UPDATE,
      { targetType: "Analysis", targetId: a._id, targetName: a.name }, req);

    if (d.doctorComment) {
      await notify(a.patient, {
        type: "analysis",
        titleKey: "notif.analysisCommented",
        vars: { name: a.name },
        page: "analyses",
        tone: "purple",
      });
    }
    return { ok: true };
  },
  { role: "doctor" }
);

// O'chirishga faqat yozuvni kiritgan shifokor haqli
export const DELETE = route(
  async ({ params, session, req }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
    const a = await Analysis.findOne({ _id: params.id, doctor: session.sub });
    if (!a) throw new ApiError("ANALYSIS_NOT_FOUND");
    await a.deleteOne();
    await audit(session, ACTIONS.ANALYSIS_DELETE,
      { targetType: "Analysis", targetId: a._id, targetName: a.name }, req);
    return { ok: true };
  },
  { role: "doctor" }
);
