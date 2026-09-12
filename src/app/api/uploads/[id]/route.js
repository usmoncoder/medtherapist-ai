import Attachment from "@/models/Attachment";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { route } from "@/lib/http";
import { objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { readFile } from "@/lib/uploads";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { audit, ACTIONS } from "@/lib/audit";
import { isAdmin } from "@/lib/roles";

export const runtime = "nodejs";

// Faylni faqat unga haqli odam yuklab oladi
export const GET = route(async ({ params, session, req }) => {
  if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");

  const att = await Attachment.findById(params.id).lean();
  if (!att) throw new ApiError("FILE_NOT_FOUND");

  const uid = session.sub;
  let allowed = att.owner.toString() === uid || att.patient?.toString() === uid;

  if (!allowed && session.role === "doctor" && att.patient) {
    await assertDoctorLinkedToPatient(uid, att.patient); // xato bo'lsa 403 tashlaydi
    allowed = true;
  }
  if (!allowed && att.context === "message") {
    // Suhbatdagi fayl — a'zolik orqali ruxsat
    const msg = await Message.findOne({ attachments: att._id }).select("conversation").lean();
    if (msg) {
      const conv = await Conversation.findById(msg.conversation).lean();
      allowed = conv && [conv.patient.toString(), conv.doctor.toString()].includes(uid);
    }
  }
  if (!allowed && isAdmin(session.role)) allowed = true;
  if (!allowed) throw new ApiError("FORBIDDEN");

  const buf = await readFile(att.storageKey).catch(() => null);
  if (!buf) throw new ApiError("FILE_NOT_FOUND");

  await audit(session, ACTIONS.FILE_DOWNLOAD,
    { targetType: "Attachment", targetId: att._id, targetName: att.name }, req);

  return new Response(buf, {
    headers: {
      "Content-Type": att.mime,
      "Content-Length": String(att.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(att.name)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
