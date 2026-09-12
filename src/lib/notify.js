import Notification from "@/models/Notification";
import { logger } from "./logger";
import { emitToUser } from "./realtime";

/**
 * Foydalanuvchiga xabarnoma yaratadi va socket orqali darhol yuboradi.
 * titleKey — i18n kaliti, vars — o'rin almashtiruvchilar.
 */
export async function notify(userId, { type, titleKey, vars, page, tone = "purple" }) {
  try {
    const n = await Notification.create({ user: userId, type, titleKey, vars, page, tone });
    emitToUser(userId, "notification:new", {
      id: n._id.toString(),
      type: n.type,
      titleKey: n.titleKey,
      vars: n.vars,
      page: n.page,
      tone: n.tone,
      read: false,
      createdAt: n.createdAt,
    });
    return n;
  } catch (e) {
    logger.warn("xabarnoma yaratilmadi", { titleKey, message: e.message });
    return null;
  }
}

export const notifyMany = (userIds, payload) =>
  Promise.all([...new Set(userIds.map(String))].map((id) => notify(id, payload)));
