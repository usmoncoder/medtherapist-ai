import User from "@/models/User";
import Appointment from "@/models/Appointment";
import Analysis from "@/models/Analysis";
import Conversation from "@/models/Conversation";
import Notification from "@/models/Notification";
import { route } from "@/lib/http";

const dayRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
};

// Bosh sahifadagi ko'rsatkichlar
export const GET = route(async ({ session }) => {
  const { from, to } = dayRange();
  const unreadNotif = await Notification.countDocuments({ user: session.sub, read: false });

  if (session.role === "doctor") {
    const convs = await Conversation.find({ doctor: session.sub }).select("patient unread").lean();
    const ids = convs.map((c) => c.patient);
    const [patients, todayCount, pending, done, analyses, critical] = await Promise.all([
      User.countDocuments({
        role: "patient",
        $or: [{ assignedDoctor: session.sub }, { _id: { $in: ids } }],
      }),
      Appointment.countDocuments({ doctor: session.sub, startsAt: { $gte: from, $lt: to } }),
      Appointment.countDocuments({ doctor: session.sub, status: "kutilmoqda" }),
      Appointment.countDocuments({ doctor: session.sub, status: "yakunlangan" }),
      Analysis.countDocuments({ doctor: session.sub }),
      Analysis.countDocuments({ doctor: session.sub, flag: "kritik" }),
    ]);
    const unread = convs.reduce((s, c) => s + (c.unread?.doctor || 0), 0);
    return { summary: { patients, todayCount, pending, done, analyses, critical, unread, unreadNotif } };
  }

  if (session.role === "patient") {
    const me = await User.findById(session.sub).select("assignedDoctor").lean();
    const [upcoming, pending, analyses, convs] = await Promise.all([
      Appointment.countDocuments({
        patient: session.sub,
        status: "tasdiqlangan",
        startsAt: { $gte: new Date() },
      }),
      Appointment.countDocuments({ patient: session.sub, status: "kutilmoqda" }),
      Analysis.countDocuments({ patient: session.sub }),
      Conversation.find({ patient: session.sub }).select("unread").lean(),
    ]);
    const unread = convs.reduce((s, c) => s + (c.unread?.patient || 0), 0);
    return {
      summary: {
        upcoming, pending, analyses, unread, unreadNotif,
        hasDoctor: Boolean(me?.assignedDoctor),
      },
    };
  }

  // admin / superadmin
  const [patients, doctors, unassigned, pendingAppts, todayAppts] = await Promise.all([
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor", isActive: true }),
    User.countDocuments({ role: "patient", assignedDoctor: null }),
    Appointment.countDocuments({ status: "kutilmoqda" }),
    Appointment.countDocuments({ startsAt: { $gte: from, $lt: to } }),
  ]);
  return { summary: { patients, doctors, unassigned, pendingAppts, todayAppts, unreadNotif } };
});
