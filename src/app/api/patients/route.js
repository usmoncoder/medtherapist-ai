import User from "@/models/User";
import Conversation from "@/models/Conversation";
import Appointment from "@/models/Appointment";
import Analysis from "@/models/Analysis";
import { route } from "@/lib/http";
import { decryptProfile } from "@/lib/crypto";

// Shifokorning bemorlari: unga biriktirilganlar + u bilan chat ochganlar
export const GET = route(
  async ({ session }) => {
    const convs = await Conversation.find({ doctor: session.sub }).select("patient").lean();
    const ids = convs.map((c) => c.patient);

    const patients = await User.find({
      role: "patient",
      $or: [{ assignedDoctor: session.sub }, { _id: { $in: ids } }],
    })
      .select("fullName email avatarUrl patientProfile assignedDoctor isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const pids = patients.map((p) => p._id);
    const [lastAppts, analysisCounts] = await Promise.all([
      Appointment.find({ doctor: session.sub, patient: { $in: pids } })
        .sort({ startsAt: -1 })
        .select("patient startsAt status")
        .lean(),
      Analysis.aggregate([
        { $match: { patient: { $in: pids } } },
        { $group: { _id: "$patient", n: { $sum: 1 }, critical: { $sum: { $cond: [{ $eq: ["$flag", "kritik"] }, 1, 0] } } } },
      ]),
    ]);

    const lastByPatient = new Map();
    for (const a of lastAppts) {
      const k = a.patient.toString();
      if (!lastByPatient.has(k)) lastByPatient.set(k, a);
    }
    const anMap = new Map(analysisCounts.map((c) => [c._id.toString(), c]));

    return {
      patients: patients.map((p) => {
        const last = lastByPatient.get(p._id.toString());
        const an = anMap.get(p._id.toString());
        return {
          id: p._id.toString(),
          fullName: p.fullName,
          email: p.email,
          isActive: p.isActive !== false,
          assigned: p.assignedDoctor?.toString() === session.sub,
          profile: decryptProfile(p.patientProfile) || {},
          analysisCount: an?.n || 0,
          criticalCount: an?.critical || 0,
          lastAppointment: last ? { at: last.startsAt, status: last.status } : null,
        };
      }),
    };
  },
  { role: "doctor" }
);
