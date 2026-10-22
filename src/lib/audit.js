import AuditLog from "@/models/AuditLog";
import { logger } from "./logger";
import { clientIp } from "./ratelimit";

export const ACTIONS = {
  LOGIN: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  LOGOUT_ALL: "logout_all",
  REGISTER: "register",
  PASSWORD_RESET_REQUEST: "password_reset_request",
  PASSWORD_RESET: "password_reset",
  TWO_FACTOR_ENABLE: "2fa_enable",
  TWO_FACTOR_DISABLE: "2fa_disable",
  PATIENT_CARD_VIEW: "patient_card_view",
  PATIENT_MEDICAL_UPDATE: "patient_medical_update",
  PATIENT_ASSIGN: "patient_assign",
  PATIENT_UNASSIGN: "patient_unassign",
  USER_CREATE: "user_create",
  USER_UPDATE: "user_update",
  USER_DEACTIVATE: "user_deactivate",
  USER_ACTIVATE: "user_activate",
  ROLE_CHANGE: "role_change",
  APPOINTMENT_CREATE: "appointment_create",
  APPOINTMENT_DECIDE: "appointment_decide",
  ENCOUNTER_CREATE: "encounter_create",
  MED_REMINDER_CREATE: "med_reminder_create",
  MED_REMINDER_DELETE: "med_reminder_delete",
  ANALYSIS_CREATE: "analysis_create",
  ANALYSIS_UPDATE: "analysis_update",
  ANALYSIS_DELETE: "analysis_delete",
  AI_ANALYSIS: "ai_analysis",
  FILE_UPLOAD: "file_upload",
  FILE_DOWNLOAD: "file_download",
  SCHEDULE_UPDATE: "schedule_update",
  DOCTOR_VERIFY: "doctor_verify",
  TWO_FACTOR_RESET: "2fa_reset",
  AUDIT_EXPORT: "audit_export",
};

/**
 * Audit yozuvi. Hech qachon asosiy oqimni to'xtatmaydi —
 * log yozilmasa ham foydalanuvchi so'rovi bajariladi.
 */
export async function audit(session, action, info = {}, req) {
  try {
    await AuditLog.create({
      actor: session?.sub || null,
      actorName: session?.name || info.actorName || "—",
      actorRole: session?.role || info.actorRole || "anon",
      action,
      targetType: info.targetType,
      targetId: info.targetId,
      targetName: info.targetName,
      meta: info.meta,
      ip: req ? clientIp(req) : info.ip,
      userAgent: req?.headers?.get?.("user-agent")?.slice(0, 200),
    });
  } catch (e) {
    logger.warn("audit yozilmadi", { action, message: e.message });
  }
}
