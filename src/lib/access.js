import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { ApiError } from "./errors";
import { isAdmin } from "./roles";

/**
 * Shifokor shu bemorga aloqadormi: biriktirilgan yoki suhbat ochilgan.
 * Administrator uchun har doim ruxsat (nazorat roli).
 */
export async function assertDoctorLinkedToPatient(doctorId, patientId, role) {
  if (isAdmin(role)) return false;
  const [assigned, conv] = await Promise.all([
    User.exists({ _id: patientId, role: "patient", assignedDoctor: doctorId }),
    Conversation.exists({ patient: patientId, doctor: doctorId }),
  ]);
  if (!assigned && !conv) throw new ApiError("FORBIDDEN");
  return Boolean(assigned);
}

/** Foydalanuvchi shu suhbat a'zosimi */
export async function assertConversationMember(conversationId, session) {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new ApiError("CONVERSATION_NOT_FOUND");
  const uid = session.sub;
  if (conv.patient.toString() !== uid && conv.doctor.toString() !== uid)
    throw new ApiError("FORBIDDEN");
  return conv;
}
