import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { route, body } from "@/lib/http";
import { createConversationSchema } from "@/lib/schemas";
import { ApiError } from "@/lib/errors";

// Joriy foydalanuvchining chatlari (bemor -> shifokorlari, shifokor -> bemorlari)
export const GET = route(async ({ session }) => {
  const isDoctor = session.role === "doctor";
  const filter = isDoctor ? { doctor: session.sub } : { patient: session.sub };

  const list = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .populate("patient", "fullName avatarUrl")
    .populate("doctor", "fullName avatarUrl doctorProfile.specialty");

  return {
    conversations: list.map((c) => {
      const peer = isDoctor ? c.patient : c.doctor;
      return {
        id: c._id.toString(),
        peer: {
          id: peer?._id?.toString() || "",
          fullName: peer?.fullName || "—",
          subtitle: isDoctor ? "" : peer?.doctorProfile?.specialty || "",
        },
        lastMessage: c.lastMessage?.text
          ? { text: c.lastMessage.text, at: c.lastMessage.at }
          : null,
        unread: c.unread?.[isDoctor ? "doctor" : "patient"] || 0,
      };
    }),
  };
});

// Bemor shifokor bilan chat ochadi (mavjud bo'lsa — o'shanisi qaytadi)
export const POST = route(
  async ({ req, session }) => {
    const { doctorId } = await body(req, createConversationSchema);

    const doctor = await User.findOne({ _id: doctorId, role: "doctor", isActive: true });
    if (!doctor) throw new ApiError("DOCTOR_NOT_FOUND");

    const conv = await Conversation.findOneAndUpdate(
      { patient: session.sub, doctor: doctorId },
      { $setOnInsert: { patient: session.sub, doctor: doctorId } },
      { new: true, upsert: true }
    );
    return Response.json({ id: conv._id.toString() }, { status: 201 });
  },
  { role: "patient" }
);
