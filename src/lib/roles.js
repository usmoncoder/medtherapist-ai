// Rol ierarxiyasi: superadmin > admin > doctor > patient
export const ROLE_RANK = { patient: 1, doctor: 2, admin: 3, superadmin: 4 };

export const isStaff = (role) => ROLE_RANK[role] >= 2;
export const isAdmin = (role) => ROLE_RANK[role] >= 3;
export const isSuperAdmin = (role) => role === "superadmin";

/** Berilgan rol talab qilingan rol(lar)ga mos keladimi */
export function hasRole(role, required) {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.includes(role);
}

/** Admin boshqa foydalanuvchini tahrirlay oladimi (o'zidan past rolni) */
export function canManage(actorRole, targetRole) {
  if (actorRole === "superadmin") return true;
  if (actorRole === "admin") return ["patient", "doctor"].includes(targetRole);
  return false;
}
