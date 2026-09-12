import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Attachment from "@/models/Attachment";
import { route, body } from "@/lib/http";
import { messageSchema, objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertConversationMember } from "@/lib/access";
import { emitToConversation } from "@/lib/realtime";
import { rateLimitAsync } from "@/lib/ratelimit";
import { notify } from "@/lib/notify";

const PAGE = 200;

const shapeAtt = (a) => ({ id: a._id.toString(), name: a.name, mime: a.mime, size: a.size });

export const GET = route(async ({ params, session }) => {
  if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
  await assertConversationMember(params.id, session);

  const messages = await Message.find({ conversation: params.id })
    .sort({ createdAt: 1 })
    .limit(PAGE)
    .populate("attachments", "name mime size")
    .lean();

  const side = session.role === "doctor" ? "doctor" : "patient";
  await Conversation.updateOne({ _id: params.id }, { $set: { [`unread.${side}`]: 0 } });

  return {
    messages: messages.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      mine: m.sender.toString() === session.sub,
      createdAt: m.createdAt,
      attachments: (m.attachments || []).map(shapeAtt),
    })),
  };
});

export const POST = route(async ({ req, params, session }) => {
  if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");
  if (!(await rateLimitAsync(`msg:${session.sub}`, { limit: 60, windowMs: 60_000 })).allowed)
    throw new ApiError("RATE_LIMITED");

  const { text, attachments } = await body(req, messageSchema);
  const conv = await assertConversationMember(params.id, session);

  // Faqat o'zi yuklagan fayllarni biriktira oladi
  let attIds = [];
  if (attachments?.length) {
    const found = await Attachment.find({ _id: { $in: attachments }, owner: session.sub })
      .select("_id name mime size").lean();
    attIds = found.map((f) => f._id);
  }

  const msg = await Message.create({
    conversation: params.id,
    sender: session.sub,
    text,
    attachments: attIds,
  });
  await msg.populate("attachments", "name mime size");

  const isDoctor = conv.doctor.toString() === session.sub;
  const otherSide = isDoctor ? "patient" : "doctor";
  const otherUser = isDoctor ? conv.patient : conv.doctor;

  await Conversation.updateOne(
    { _id: params.id },
    {
      $set: { lastMessage: { text: msg.text || "📎", at: msg.createdAt, from: session.sub } },
      $inc: { [`unread.${otherSide}`]: 1 },
    }
  );

  const payload = {
    id: msg._id.toString(),
    conversationId: params.id,
    senderId: session.sub,
    text: msg.text,
    attachments: (msg.attachments || []).map(shapeAtt),
    createdAt: msg.createdAt,
  };
  emitToConversation(params.id, "message:new", payload);

  await notify(otherUser, {
    type: "message",
    titleKey: "notif.newMessage",
    vars: { name: session.name || "" },
    page: "chat",
    tone: "purple",
  });

  return Response.json({ id: msg._id.toString(), attachments: payload.attachments }, { status: 201 });
});
