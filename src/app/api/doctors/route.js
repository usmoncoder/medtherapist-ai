import User from "@/models/User";
import Schedule from "@/models/Schedule";
import { route } from "@/lib/http";

// Shifokorlar ro'yxati (maxfiy maydonlarsiz)
export const GET = route(async () => {
  const doctors = await User.find({ role: "doctor", isActive: true })
    .select("fullName doctorProfile avatarUrl")
    .sort({ fullName: 1 })
    .lean();

  const withSchedule = new Set(
    (await Schedule.find({ doctor: { $in: doctors.map((d) => d._id) } }).select("doctor").lean())
      .map((s) => s.doctor.toString())
  );

  return {
    doctors: doctors.map((d) => ({
      id: d._id.toString(),
      fullName: d.fullName,
      avatarUrl: d.avatarUrl ?? null,
      hasSchedule: withSchedule.has(d._id.toString()),
      profile: {
        specialty: d.doctorProfile?.specialty || "",
        department: d.doctorProfile?.department || "",
        experienceYears: d.doctorProfile?.experienceYears ?? null,
        clinic: d.doctorProfile?.clinic || "",
        room: d.doctorProfile?.room || "",
        bio: d.doctorProfile?.bio || "",
        isVerified: Boolean(d.doctorProfile?.isVerified),
      },
    })),
  };
});
