import Analysis from "@/models/Analysis";
import Attachment from "@/models/Attachment";
import { route, body } from "@/lib/http";
import { createAnalysisSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { audit, ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";

const shape = (a) => ({
  id: a._id.toString(),
  name: a.name,
  value: a.value,
  unit: a.unit || "",
  refRange: a.refRange || "",
  flag: a.flag || "norma",
  takenAt: a.takenAt,
  doctorComment: a.doctorComment || "",
  attachments: (a.attachments || []).map((x) =>
    x?._id ? { id: x._id.toString(), name: x.name, mime: x.mime, size: x.size } : { id: String(x) }
  ),
});

// Bemor -> o'z analizlari. Shifokor -> ?patient=<id> bo'yicha
export const GET = route(async ({ req, session }) => {
  let patientId = session.sub;
  if (session.role !== "patient") {
    patientId = new URL(req.url).searchParams.get("patient");
    if (!patientId || !objectId.safeParse(patientId).success)
      throw new ApiError("VALIDATION", "patient parametri kerak");
    if (session.role === "doctor") await assertDoctorLinkedToPatient(session.sub, patientId);
  }
  const list = await Analysis.find({ patient: patientId })
    .sort({ takenAt: -1 })
    .limit(200)
    .populate("attachments", "name mime size")
    .lean();
  return { analyses: list.map(shape) };
});

// Analizni FAQAT shifokor kiritadi
export const POST = route(
  async ({ req, session }) => {
    const d = await body(req, createAnalysisSchema);
    if (!d.value) throw new ApiError("VALIDATION", "Natija qiymatini yozing");
    await assertDoctorLinkedToPatient(session.sub, d.patientId);

    const takenAt = d.takenAt ? new Date(d.takenAt) : new Date();
    if (Number.isNaN(takenAt.getTime())) throw new ApiError("VALIDATION", "Sana noto'g'ri");
    if (takenAt.getTime() > Date.now() + 864e5)
      throw new ApiError("VALIDATION", "Kelajakdagi sana bo'lmasin");

    // Fayllar shu shifokorga va shu bemorga tegishli bo'lishi shart
    let attachments = [];
    if (d.attachments?.length) {
      const found = await Attachment.find({
        _id: { $in: d.attachments },
        owner: session.sub,
        patient: d.patientId,
      }).select("_id").lean();
      attachments = found.map((f) => f._id);
    }

    const a = await Analysis.create({
      patient: d.patientId,
      doctor: session.sub,
      name: d.name,
      value: d.value,
      unit: d.unit,
      refRange: d.refRange,
      flag: d.flag || "norma",
      takenAt,
      doctorComment: d.doctorComment,
      attachments,
    });

    await audit(session, ACTIONS.ANALYSIS_CREATE,
      { targetType: "Analysis", targetId: a._id, targetName: a.name, meta: { patientId: d.patientId } }, req);

    await notify(d.patientId, {
      type: "analysis",
      titleKey: "notif.newAnalysis",
      vars: { name: a.name },
      page: "analyses",
      tone: a.flag === "kritik" ? "red" : a.flag === "norma" ? "green" : "amber",
    });

    return Response.json({ analysis: shape(a) }, { status: 201 });
  },
  { role: "doctor" }
);
