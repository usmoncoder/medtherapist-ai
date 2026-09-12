import Attachment from "@/models/Attachment";
import User from "@/models/User";
import { route } from "@/lib/http";
import { ApiError } from "@/lib/errors";
import { saveFile, MAX_FILE_BYTES } from "@/lib/uploads";
import { objectId } from "@/lib/schemas";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { rateLimitAsync } from "@/lib/ratelimit";
import { audit, ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

// Fayl yuklash (multipart/form-data): file, context=message|analysis, patientId?
export const POST = route(async ({ req, session }) => {
  if (!(await rateLimitAsync(`upload:${session.sub}`, { limit: 40, windowMs: 60 * 60_000 })).allowed)
    throw new ApiError("RATE_LIMITED");

  let form;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError("VALIDATION", "multipart/form-data kutilgan edi");
  }

  const file = form.get("file");
  const context = String(form.get("context") || "message");
  if (!["message", "analysis"].includes(context)) throw new ApiError("VALIDATION", "context noto'g'ri");
  if (context === "analysis" && session.role !== "doctor") throw new ApiError("FORBIDDEN");

  // Analiz fayli aniq bemorga tegishli bo'lishi shart
  let patient = null;
  const patientId = form.get("patientId");
  if (patientId) {
    if (!objectId.safeParse(String(patientId)).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
    if (session.role === "doctor") await assertDoctorLinkedToPatient(session.sub, String(patientId));
    else if (String(patientId) !== session.sub) throw new ApiError("FORBIDDEN");
    patient = String(patientId);
  } else if (session.role === "patient") {
    patient = session.sub;
  }
  if (context === "analysis" && !patient) throw new ApiError("VALIDATION", "patientId kerak");

  const saved = await saveFile(file);
  const att = await Attachment.create({ ...saved, owner: session.sub, patient, context });

  await audit(session, ACTIONS.FILE_UPLOAD, {
    targetType: "Attachment", targetId: att._id, targetName: saved.name,
    meta: { size: saved.size, mime: saved.mime, context },
  }, req);

  return Response.json(
    { attachment: { id: att._id.toString(), name: att.name, mime: att.mime, size: att.size } },
    { status: 201 }
  );
});

export const GET = route(async () => ({ maxBytes: MAX_FILE_BYTES }));
