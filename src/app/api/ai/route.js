import User from "@/models/User";
import Analysis from "@/models/Analysis";
import AiReport from "@/models/AiReport";
import { route, body } from "@/lib/http";
import { aiRequestSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { assertDoctorLinkedToPatient } from "@/lib/access";
import { analyzeCase, geminiConfigured, geminiModel } from "@/lib/gemini";
import { decryptProfile } from "@/lib/crypto";
import { rateLimitAsync } from "@/lib/ratelimit";
import { audit, ACTIONS } from "@/lib/audit";

const LANGS = ["uz", "uzc", "ru"];

const age = (birthDate) => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

// So'nggi tahlillar ro'yxati
export const GET = route(
  async ({ session }) => {
    const list = await AiReport.find({ doctor: session.sub })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("patient", "fullName");
    return {
      configured: geminiConfigured(),
      model: geminiConfigured() ? geminiModel() : null,
      reports: list.map((r) => ({
        id: r._id.toString(),
        patientId: r.patient?._id?.toString() || "",
        patientName: r.patient?.fullName || "—",
        summary: r.result?.summary || "",
        createdAt: r.createdAt,
      })),
    };
  },
  { role: "doctor" }
);

export const POST = route(
  async ({ req, session }) => {
    if (!geminiConfigured()) throw new ApiError("AI_NOT_CONFIGURED");
    if (!(await rateLimitAsync(`ai:${session.sub}`, { limit: 30, windowMs: 60 * 60_000 })).allowed)
      throw new ApiError("RATE_LIMITED");

    const d = await body(req, aiRequestSchema);
    const lang = LANGS.includes(req.headers.get("x-lang")) ? req.headers.get("x-lang") : "uz";

    const patient = await User.findOne({ _id: d.patientId, role: "patient" });
    if (!patient) throw new ApiError("PATIENT_NOT_FOUND");
    await assertDoctorLinkedToPatient(session.sub, d.patientId);

    const analyses = await Analysis.find({ patient: d.patientId })
      .sort({ takenAt: -1 })
      .limit(15)
      .lean();
    const p = decryptProfile(patient.patientProfile?.toObject?.() ?? patient.patientProfile) || {};

    const result = await analyzeCase(
      {
        patientName: patient.fullName,
        age: age(p.birthDate),
        gender: p.gender,
        complaint: d.complaint,
        symptoms: d.symptoms || [],
        bp: d.bp,
        pulse: d.pulse,
        temp: d.temp,
        spo2: d.spo2,
        allergies: (p.allergies || []).join(", "),
        chronic: (p.chronicConditions || []).join(", "),
        history: p.history,
        extra: d.extra,
        analyses: analyses.map((a) => `${a.name}: ${a.value} ${a.unit || ""}`.trim()).join("; "),
      },
      lang
    );

    await audit(session, ACTIONS.AI_ANALYSIS, {
      targetType: "User", targetId: patient._id, targetName: patient.fullName,
      meta: { model: result.model, lang },
    }, req);

    await AiReport.create({
      patient: patient._id,
      doctor: session.sub,
      lang,
      input: {
        complaint: d.complaint,
        symptoms: d.symptoms || [],
        bp: d.bp,
        pulse: d.pulse != null ? String(d.pulse) : "",
        temp: d.temp != null ? String(d.temp) : "",
        spo2: d.spo2 != null ? String(d.spo2) : "",
        extra: d.extra,
      },
      result,
      model: result.model,
    });

    return { result };
  },
  { role: "doctor" }
);
