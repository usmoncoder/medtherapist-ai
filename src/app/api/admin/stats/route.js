import User from "@/models/User";
import Appointment from "@/models/Appointment";
import Analysis from "@/models/Analysis";
import Message from "@/models/Message";
import AiReport from "@/models/AiReport";
import AuditLog from "@/models/AuditLog";
import { route } from "@/lib/http";

const dayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Butun klinika bo'yicha ko'rsatkichlar
export const GET = route(
  async () => {
    const today = dayStart();
    const monthAgo = new Date(Date.now() - 30 * 864e5);

    const [
      patients, doctors, admins, superadmins, inactive, unassigned,
      todayAppts, pendingAppts, doneAppts, analyses, messages, aiReports, auditToday,
    ] = await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "superadmin" }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: "patient", assignedDoctor: null }),
      Appointment.countDocuments({ startsAt: { $gte: today, $lt: new Date(today.getTime() + 864e5) } }),
      Appointment.countDocuments({ status: "kutilmoqda" }),
      Appointment.countDocuments({ status: "yakunlangan" }),
      Analysis.countDocuments({}),
      Message.countDocuments({ createdAt: { $gte: monthAgo } }),
      AiReport.countDocuments({}),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // Shifokorlar bo'yicha yuklama
    const load = await User.aggregate([
      { $match: { role: "patient", assignedDoctor: { $ne: null } } },
      { $group: { _id: "$assignedDoctor", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "doc" } },
      { $project: { n: 1, fullName: { $arrayElemAt: ["$doc.fullName", 0] } } },
      // O'chirilgan shifokorga havola qilgan yozuvlarni chiqarib tashlaymiz
      { $match: { fullName: { $ne: null } } },
    ]);

    // Oxirgi 6 oy bo'yicha navbatlar
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
      months.push({ month: from.getMonth(), from, to });
    }
    const monthly = await Promise.all(
      months.map(async (m) => ({
        month: m.month,
        count: await Appointment.countDocuments({ startsAt: { $gte: m.from, $lt: m.to } }),
      }))
    );

    return {
      stats: {
        patients, doctors, admins, superadmins, inactive, unassigned,
        todayAppts, pendingAppts, doneAppts, analyses, messages, aiReports, auditToday,
      },
      doctorLoad: load.map((l) => ({ id: l._id.toString(), name: l.fullName, count: l.n })),
      monthly,
    };
  },
  { role: ["admin", "superadmin"] }
);
