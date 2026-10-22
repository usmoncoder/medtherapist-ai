import MedicationReminder from "@/models/MedicationReminder";
import { route } from "@/lib/http";
import { objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { audit, ACTIONS } from "@/lib/audit";

// Shifokor o'zi qo'ygan dori eslatmasini o'chiradi
export const DELETE = route(
  async ({ params, session, req }) => {
    if (!objectId.safeParse(params.id).success) throw new ApiError("VALIDATION", "ID noto'g'ri");

    const rem = await MedicationReminder.findById(params.id);
    if (!rem) throw new ApiError("NOT_FOUND");
    if (rem.doctor.toString() !== session.sub) throw new ApiError("FORBIDDEN");

    await rem.deleteOne();

    await audit(session, ACTIONS.MED_REMINDER_DELETE, {
      targetType: "MedicationReminder", targetId: rem._id, targetName: rem.name,
    }, req);

    return { ok: true };
  },
  { role: "doctor" }
);
