import Notification from "@/models/Notification";
import { route, body } from "@/lib/http";
import { readNotificationsSchema } from "@/lib/schemas";

const shape = (n) => ({
  id: n._id.toString(),
  type: n.type,
  titleKey: n.titleKey,
  vars: n.vars || {},
  page: n.page || "dashboard",
  tone: n.tone || "purple",
  read: Boolean(n.read),
  createdAt: n.createdAt,
});

export const GET = route(async ({ session }) => {
  const list = await Notification.find({ user: session.sub })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return {
    notifications: list.map(shape),
    unread: list.filter((n) => !n.read).length,
  };
});

// O'qildi deb belgilash: {all:true} yoki {ids:[...]}
export const POST = route(async ({ req, session }) => {
  const { ids, all } = await body(req, readNotificationsSchema);
  const filter = { user: session.sub, read: false };
  if (!all) filter._id = { $in: ids || [] };
  const res = await Notification.updateMany(filter, { $set: { read: true } });
  return { ok: true, updated: res.modifiedCount };
});
