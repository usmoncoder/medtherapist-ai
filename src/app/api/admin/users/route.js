import User from "@/models/User";
import Conversation from "@/models/Conversation";
import { route, body } from "@/lib/http";
import { adminCreateUserSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth";
import { canManage } from "@/lib/roles";
import { decryptProfile, encryptProfile } from "@/lib/crypto";
import { audit, ACTIONS } from "@/lib/audit";

const shape = (u, extra = {}) => ({
  id: u._id.toString(),
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  isActive: u.isActive !== false,
  twoFactorEnabled: Boolean(u.twoFactor?.enabled),
  createdAt: u.createdAt,
  lastSeenAt: u.lastSeenAt || null,
  assignedDoctor: u.assignedDoctor ? u.assignedDoctor.toString() : null,
  profile: (u.role === "doctor" ? u.doctorProfile : decryptProfile(u.patientProfile)) || {},
  ...extra,
});

// Foydalanuvchilar ro'yxati — ?role=&q=&page=
export const GET = route(
  async ({ req, session }) => {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const q = (url.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Number(url.searchParams.get("limit") || 50));

    // Administrator faqat bemor va shifokorlarni ko'radi.
    // Administrator va bosh administrator hisoblari — bosh administrator ixtiyorida.
    const visible = session.role === "superadmin"
      ? ["patient", "doctor", "admin", "superadmin"]
      : ["patient", "doctor"];

    const filter = { role: { $in: visible } };
    if (role && role !== "all") {
      if (!visible.includes(role)) throw new ApiError("ROLE_NOT_ALLOWED");
      filter.role = role;
    }
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ fullName: rx }, { email: rx }];
    }

    const [total, users, doctors] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.find({ role: "doctor" }).select("fullName doctorProfile").lean(),
    ]);

    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d.fullName]));
    // Har bir shifokorda nechta bemor borligini sanaymiz
    const counts = await User.aggregate([
      { $match: { role: "patient", assignedDoctor: { $ne: null } } },
      { $group: { _id: "$assignedDoctor", n: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.n]));

    return {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      users: users.map((u) =>
        shape(u, {
          assignedDoctorName: u.assignedDoctor ? doctorMap.get(u.assignedDoctor.toString()) || null : null,
          patientCount: u.role === "doctor" ? countMap.get(u._id.toString()) || 0 : undefined,
        })
      ),
      doctors: doctors.map((d) => ({
        id: d._id.toString(),
        fullName: d.fullName,
        specialty: d.doctorProfile?.specialty || "",
        department: d.doctorProfile?.department || "",
        patientCount: countMap.get(d._id.toString()) || 0,
      })),
    };
  },
  { role: ["admin", "superadmin"] }
);

// Yangi hodim yoki bemor yaratish
export const POST = route(
  async ({ req, session }) => {
    const d = await body(req, adminCreateUserSchema);
    if (!canManage(session.role, d.role)) throw new ApiError("ROLE_NOT_ALLOWED");
    if (await User.exists({ email: d.email })) throw new ApiError("EMAIL_TAKEN");

    const user = await User.create({
      fullName: d.fullName,
      email: d.email,
      role: d.role,
      passwordHash: await hashPassword(d.password),
      createdBy: session.sub,
      ...(d.role === "doctor"
        ? {
            doctorProfile: {
              specialty: d.specialty || "Terapevt",
              department: d.department || "",
              phone: d.phone,
              isVerified: true,
            },
          }
        : d.role === "patient"
        ? { patientProfile: { phone: d.phone, cardNumber: `MT-${Date.now().toString(36).toUpperCase()}` } }
        : {}),
    });

    await audit(session, ACTIONS.USER_CREATE,
      { targetType: "User", targetId: user._id, targetName: user.fullName, meta: { role: d.role } }, req);

    return Response.json({ user: shape(user) }, { status: 201 });
  },
  { role: ["admin", "superadmin"] }
);

export { shape as shapeUser };
