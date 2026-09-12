// Edge runtime (middleware) uchun — faqat jose, bcrypt yo'q
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export const COOKIE = "mt_token";

export async function signToken(payload, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { sub, role, name } yoki { sub, pending2fa: true }
  } catch {
    return null;
  }
}
