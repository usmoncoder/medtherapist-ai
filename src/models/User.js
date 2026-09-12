import mongoose from "mongoose";
import { decryptProfile } from "@/lib/crypto";

export const ROLES = ["patient", "doctor", "admin", "superadmin"];
export const STAFF_ROLES = ["doctor", "admin", "superadmin"];

const patientProfile = new mongoose.Schema(
  {
    birthDate: Date,
    gender: { type: String, enum: ["erkak", "ayol"] },
    phone: String,
    address: String,
    bloodType: String,
    allergies: [String],
    chronicConditions: [String],
    complaint: String,
    history: String,
    medications: [{ name: String, dose: String, schedule: String, _id: false }],
    cardNumber: String, // klinika kartasi raqami
  },
  { _id: false }
);

const doctorProfile = new mongoose.Schema(
  {
    specialty: { type: String, default: "Terapevt" },
    department: String, // bo'lim: Terapiya, Kardiologiya, ...
    licenseNumber: String,
    experienceYears: Number,
    clinic: String,
    room: String,
    phone: String,
    bio: String,
    isVerified: { type: Boolean, default: false },
    maxPatients: { type: Number, default: 200 },
  },
  { _id: false }
);

// TOTP asosidagi ikki bosqichli tasdiqlash
const twoFactor = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    secret: String,          // base32, faqat serverda
    backupCodes: [String],   // sha256 hash
    confirmedAt: Date,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    lastSeenAt: Date,

    // Bemor o'z shifokoriga biriktiriladi — buni administrator qiladi
    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Oshirilsa — barcha eski JWT'lar yaroqsiz bo'ladi ("hamma joydan chiqish")
    tokenVersion: { type: Number, default: 0 },
    twoFactor: { type: twoFactor, default: () => ({ enabled: false }) },

    patientProfile: { type: patientProfile, default: undefined },
    doctorProfile: { type: doctorProfile, default: undefined },
  },
  { timestamps: true }
);

userSchema.index({ fullName: "text", email: "text" });

// Mongoose hujjatini React client komponentga uzatib bo'lmaydi — oddiy obyektga aylantiramiz
const plain = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));

userSchema.methods.toPublic = function () {
  const raw = this.role === "doctor" ? this.doctorProfile : this.patientProfile;
  // Bemor profilidagi tibbiy matn bazada shifrlangan — bu yerda ochiladi
  const profile = this.role === "patient" ? decryptProfile(plain(raw)) : raw;
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    avatarUrl: this.avatarUrl ?? null,
    isActive: this.isActive !== false,
    assignedDoctor: this.assignedDoctor ? this.assignedDoctor.toString() : null,
    twoFactorEnabled: Boolean(this.twoFactor?.enabled),
    profile: plain(profile) ?? {},
  };
};

export default mongoose.models.User || mongoose.model("User", userSchema);
