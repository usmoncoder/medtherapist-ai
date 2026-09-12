import { redirect } from "next/navigation";
import { getSession } from "./session";
import { dbConnect } from "./db";
import { tokenValid } from "./tokenVersion";
import User from "@/models/User";

/**
 * Server sahifalari uchun foydalanuvchini yuklaydi.
 *
 * Nega alohida funksiya: cookie'dagi JWT imzosi to'g'ri bo'lsa ham sessiya yaroqsiz
 * bo'lishi mumkin — hisob o'chirilgan, bloklangan yoki "barcha qurilmalardan chiqish"
 * bosilgan. Bunday holatda oddiy `redirect("/login")` **cheksiz halqa** yasaydi:
 * middleware imzoni ko'rib foydalanuvchini yana kabinetga qaytaradi
 * (ERR_TOO_MANY_REDIRECTS). Shuning uchun bu yerda cookie'ni tozalaydigan
 * `/api/auth/expired` ga yo'naltiramiz — middleware endi tokenni ko'rmaydi.
 */
export async function loadPageUser(roles) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role)) redirect("/");

  await dbConnect();
  const user = await User.findById(s.sub);
  if (!user || user.isActive === false || !(await tokenValid(s))) redirect("/api/auth/expired");

  return user;
}
