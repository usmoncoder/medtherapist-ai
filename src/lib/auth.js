// Node runtime uchun — parol hash'lash + JWT re-export
import bcrypt from "bcryptjs";

export { signToken, verifyToken, COOKIE } from "./jwt";

export const hashPassword = (p) => bcrypt.hash(p, 10);
export const comparePassword = (p, h) => bcrypt.compare(p, h);
