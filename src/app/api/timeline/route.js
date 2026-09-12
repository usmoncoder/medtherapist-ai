import Appointment from "@/models/Appointment";
import Analysis from "@/models/Analysis";
import Encounter from "@/models/Encounter";
import { route } from "@/lib/http";
import { objectId } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { decrypt } from "@/lib/crypto";

/**
 * Bemorning yagona tibbiy lentasi: navbatlar + analizlar + qabul xulosalari,
 * vaqt bo'yicha tartiblangan.
 */
export const GET = route(async ({ req, session }) => {
  let patientId = session.sub;
  if (session.role !== "patient") {
    patientId = new URL(req.url).searchParams.get("patient");
    if (!patientId || !objectId.safeParse(patientId).success)
      throw new ApiError("VALIDATION", "patient parametri kerak");
    if (session.role === "doctor") await assertDoctorLinkedToPatient(session.sub, patientId);
  }

  const [appts, analyses, encounters] = await Promise.all([
    Appointment.find({ patient: patientId }).sort({ startsAt: -1 }).limit(60)
      .populate("doctor", "fullName").lean(),
    Analysis.find({ patient: patientId }).sort({ takenAt: -1 }).limit(80)
      .populate("doctor", "fullName").lean(),
    Encounter.find({ patient: patientId }).sort({ createdAt: -1 }).limit(60)
      .populate("doctor", "fullName").lean(),
  ]);

  const items = [
    ...appts.map((a) => ({
      kind: "appointment",
      id: a._id.toString(),
      at: a.startsAt,
      title: a.reason || "",
      status: a.status,
      doctorName: a.doctor?.fullName || "",
      note: a.doctorNote || "",
    })),
    ...analyses.map((a) => ({
      kind: "analysis",
      id: a._id.toString(),
      at: a.takenAt,
      title: a.name,
      value: `${a.value} ${a.unit || ""}`.trim(),
      flag: a.flag || "norma",
      doctorName: a.doctor?.fullName || "",
      note: a.doctorComment || "",
    })),
    ...encounters.map((e) => ({
      kind: "encounter",
      id: e._id.toString(),
      at: e.createdAt,
      title: decrypt(e.assessment || ""),
      plan: decrypt(e.plan || ""),
      doctorName: e.doctor?.fullName || "",
      prescriptions: (e.prescriptions || []).length,
    })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at));

  return { items: items.slice(0, 120) };
});
