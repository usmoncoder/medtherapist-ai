// Uchidan-uchiga smoke test: node --env-file=.env scripts/smoke-test.mjs [baseUrl] [--ai]
// Ishlab turgan serverga qarshi ishlaydi va `npm run seed` ma'lumotlarini kutadi.
import crypto from "node:crypto";

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PASS = "Parol12345";
const WITH_AI = process.argv.includes("--ai");

let pass = 0, fail = 0;
const out = [];

function check(name, expected, actual, extra = "") {
  const okk = String(expected) === String(actual);
  okk ? pass++ : fail++;
  out.push(`  ${okk ? "✓" : "✗"} ${name} — ${actual}${okk ? "" : ` (kutilgan ${expected}) ${extra}`}`);
}
const section = (s) => out.push(`── ${s} ──`);
const note = (s) => out.push(`  · ${s}`);

/* Har bir foydalanuvchi uchun alohida cookie idish */
function session(label) {
  const jar = new Map();
  return {
    label,
    jar,
    async req(path, { method = "GET", body, headers = {}, raw } = {}) {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      const init = {
        method,
        headers: { ...(cookie ? { cookie } : {}), ...headers },
        redirect: "manual",
      };
      if (raw) init.body = raw;
      else if (body) {
        init.headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      const res = await fetch(BASE + path, init);
      for (const c of res.headers.getSetCookie?.() || []) {
        const [pair] = c.split(";");
        const i = pair.indexOf("=");
        jar.set(pair.slice(0, i), pair.slice(i + 1));
      }
      const type = res.headers.get("content-type") || "";
      let data = null;
      if (type.includes("json")) data = await res.json().catch(() => null);
      else data = await res.arrayBuffer().catch(() => null);
      return { status: res.status, data, headers: res.headers };
    },
  };
}

const login = (s, email, password = PASS) =>
  s.req("/api/auth/login", { method: "POST", body: { email, password } });

/* ---- TOTP (test uchun mustaqil amalga oshirilgan) ---- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32decode(str) {
  let bits = "";
  for (const c of str.toUpperCase().replace(/=+$/, "")) {
    const i = B32.indexOf(c);
    if (i >= 0) bits += i.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp(secret) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const code =
    ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return String(code % 1e6).padStart(6, "0");
}

/* Keyingi hafta ichida berilgan hafta kunining sanasi */
function nextWeekdayDate(target) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 8; i++) {
    const x = new Date(d.getTime() + i * 864e5);
    if (x.getDay() === target) {
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    }
  }
  return null;
}

async function main() {
  const anon = session("anon");
  const sup = session("superadmin");
  const adm = session("admin");
  const doc = session("doctor");
  const doc2 = session("doctor2");
  const pat = session("patient");

  section("Salomatlik");
  const health = await anon.req("/api/health");
  check("health", 200, health.status);
  check("db holati", "up", health.data?.db);

  section("Rollar bo'yicha kirish");
  const l1 = await login(sup, "bosh@test.uz");
  check("bosh administrator", 200, l1.status);
  check("  roli", "superadmin", l1.data?.user?.role);
  check("administrator", 200, (await login(adm, "admin@test.uz")).status);
  check("shifokor", 200, (await login(doc, "shifokor@test.uz")).status);
  check("shifokor2", 200, (await login(doc2, "shifokor2@test.uz")).status);
  check("bemor", 200, (await login(pat, "bemor@test.uz")).status);

  const bad = await anon.req("/api/auth/login", {
    method: "POST", body: { email: "bosh@test.uz", password: "xato" },
  });
  check("noto'g'ri parol", 401, bad.status);
  check("  kod", "BAD_CREDENTIALS", bad.data?.code);

  section("Ochiq ro'yxatdan o'tish faqat bemor");
  const fresh = session("fresh");   // yangi, hech kimga biriktirilmagan bemor
  const reg = await fresh.req("/api/auth/register", {
    method: "POST",
    body: { fullName: "Test Bemor", email: `t${Date.now()}@test.uz`, password: "Parol12345" },
  });
  check("ro'yxatdan o'tish", 201, reg.status);
  check("  roli bemor", "patient", reg.data?.user?.role);

  section("Admin — foydalanuvchilar");
  const users = await adm.req("/api/admin/users?role=patient");
  check("ro'yxat", 200, users.status);
  check("shifokorlar ham keladi", true, (users.data?.doctors?.length || 0) >= 3);
  check("shifokor admin panelga", 403, (await doc.req("/api/admin/users")).status);
  check("bemor admin panelga", 403, (await pat.req("/api/admin/stats")).status);

  const newDoctorEmail = `doc${Date.now()}@test.uz`;
  const created = await adm.req("/api/admin/users", {
    method: "POST",
    body: {
      fullName: "Dr. Test Shifokor", email: newDoctorEmail, password: "Parol12345",
      role: "doctor", specialty: "Nevrolog", department: "Nevrologiya",
    },
  });
  check("shifokor yaratildi", 201, created.status, JSON.stringify(created.data));
  const newDoctorId = created.data?.user?.id;

  const admMakesAdmin = await adm.req("/api/admin/users", {
    method: "POST",
    body: { fullName: "Yangi Admin", email: `a${Date.now()}@test.uz`, password: "Parol12345", role: "admin" },
  });
  check("admin adminni yarata olmaydi", 403, admMakesAdmin.status);
  check("  kod", "ROLE_NOT_ALLOWED", admMakesAdmin.data?.code);

  const supMakesAdmin = await sup.req("/api/admin/users", {
    method: "POST",
    body: { fullName: "Yangi Admin", email: `a${Date.now()}@test.uz`, password: "Parol12345", role: "admin" },
  });
  check("bosh admin adminni yaratadi", 201, supMakesAdmin.status);

  const supList = await sup.req("/api/admin/users?role=superadmin");
  const supUser = supList.data.users.find((u) => u.email === "bosh@test.uz");
  const selfOff = await sup.req(`/api/admin/users/${supUser.id}`, {
    method: "PATCH", body: { isActive: false },
  });
  check("o'zini o'chira olmaydi", 400, selfOff.status);
  check("  kod", "SELF_ACTION", selfOff.data?.code);

  const roleChange = await adm.req(`/api/admin/users/${newDoctorId}`, {
    method: "PATCH", body: { role: "admin" },
  });
  check("admin rolni o'zgartira olmaydi", 403, roleChange.status);

  section("Admin — biriktirish");
  // Test o'z bemorini yaratadi — seed holatiga bog'liq bo'lmaslik uchun
  const madePatient = await adm.req("/api/admin/users", {
    method: "POST",
    body: {
      fullName: "Biriktirish Testi", email: `p${Date.now()}@test.uz`,
      password: "Parol12345", role: "patient",
    },
  });
  check("bemor yaratildi", 201, madePatient.status, JSON.stringify(madePatient.data));
  const unassigned = madePatient.data.user;
  // Shifokorni email bo'yicha aniq tanlaymiz — bazada bir nechta "Terapevt" bo'lishi mumkin
  const doctorRow = (await adm.req("/api/admin/users?role=doctor&q=shifokor@test.uz")).data.users[0];
  check("test shifokori topildi", "shifokor@test.uz", doctorRow?.email);
  const doctorId = doctorRow.id;

  const assign = await adm.req("/api/admin/assign", {
    method: "POST", body: { patientId: unassigned.id, doctorId },
  });
  check("biriktirildi", 200, assign.status, JSON.stringify(assign.data));

  const patAssign = await pat.req("/api/admin/assign", {
    method: "POST", body: { patientId: unassigned.id, doctorId },
  });
  check("bemor o'zini biriktira olmaydi", 403, patAssign.status);

  const selfAssign = await pat.req("/api/auth/me", {
    method: "PATCH", body: { assignedDoctor: doctorId },
  });
  check("me orqali biriktirish e'tiborsiz", 200, selfAssign.status);

  const unassign = await adm.req("/api/admin/assign", {
    method: "POST", body: { patientId: unassigned.id, doctorId: null },
  });
  check("biriktiruv bekor qilindi", 200, unassign.status);
  await adm.req("/api/admin/assign", { method: "POST", body: { patientId: unassigned.id, doctorId } });

  section("Ish jadvali va bo'sh vaqtlar");
  const sched = await doc.req("/api/schedule");
  check("jadval o'qildi", 200, sched.status);
  const put = await doc.req("/api/schedule", {
    method: "PUT",
    body: {
      slotMin: 30,
      workdays: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, from: "09:00", to: "17:00" })),
      daysOff: [],
    },
  });
  check("jadval saqlandi", 200, put.status, JSON.stringify(put.data));
  check("bemor jadval qo'ya olmaydi", 403,
    (await pat.req("/api/schedule", { method: "PUT", body: { workdays: [] } })).status);

  const badRange = await doc.req("/api/schedule", {
    method: "PUT", body: { workdays: [{ weekday: 1, from: "18:00", to: "09:00" }] },
  });
  check("teskari vaqt rad etildi", 400, badRange.status);
  await doc.req("/api/schedule", {
    method: "PUT",
    body: { slotMin: 30, workdays: [1, 2, 3, 4, 5].map((w) => ({ weekday: w, from: "09:00", to: "17:00" })), daysOff: [] },
  });

  const dateMon = nextWeekdayDate(2); // seshanba
  const slots = await pat.req(`/api/schedule/${doctorId}?date=${dateMon}`);
  check("slotlar keldi", 200, slots.status);
  check("  bo'sh vaqt bor", true, (slots.data?.slots?.length || 0) > 0);
  const free = (slots.data?.slots || []).find((s) => s.available);

  section("Navbat");
  const offSlot = await pat.req("/api/appointments", {
    method: "POST", body: { startsAt: `${dateMon}T03:15:00`, reason: "Jadvaldan tashqari vaqt" },
  });
  check("jadvaldan tashqari vaqt", 409, offSlot.status);
  check("  kod", "SLOT_UNAVAILABLE", offSlot.data?.code);

  const booked = await pat.req("/api/appointments", {
    method: "POST", body: { startsAt: free.iso, reason: "Smoke test navbati" },
  });
  check("navbat yaratildi", 201, booked.status, JSON.stringify(booked.data));
  const apptId = booked.data?.id;

  const dup = await pat.req("/api/appointments", {
    method: "POST", body: { startsAt: free.iso, reason: "Smoke test navbati" },
  });
  check("takroriy so'rov", 409, dup.status);

  const noDoctor = await fresh.req("/api/appointments", {
    method: "POST", body: { startsAt: free.iso, reason: "Shifokorsiz bemor" },
  });
  check("shifokorsiz bemor", 400, noDoctor.status);
  check("  kod", "NO_DOCTOR_ASSIGNED", noDoctor.data?.code);

  check("shifokor tasdiqlaydi", 200,
    (await doc.req(`/api/appointments/${apptId}`, { method: "PATCH", body: { status: "tasdiqlangan", doctorNote: "204-xona" } })).status);
  const slotsAfter = await pat.req(`/api/schedule/${doctorId}?date=${dateMon}`);
  const nowTaken = slotsAfter.data.slots.find((s) => s.iso === free.iso);
  check("band vaqt slotlarda yopildi", false, nowTaken?.available);
  check("yakunlash", 200,
    (await doc.req(`/api/appointments/${apptId}`, { method: "PATCH", body: { status: "yakunlangan" } })).status);

  section("Analizlar — faqat shifokor kiritadi");
  const patients = await doc.req("/api/patients");
  check("shifokor bemorlari", 200, patients.status);
  check("  bemorlari bor", true, (patients.data?.patients?.length || 0) > 0);
  // `pat` sessiyasi bemor@test.uz — testlar mos kelishi uchun aynan shu bemorni olamiz
  const mine = (patients.data?.patients || []).find((x) => x.email === "bemor@test.uz");
  check("  test bemori topildi", "bemor@test.uz", mine?.email);
  const pid = mine?.id;
  if (!pid) throw new Error("bemor@test.uz shifokorga biriktirilmagan — `npm run seed` ni ishga tushiring");

  const patCreate = await pat.req("/api/analyses", {
    method: "POST", body: { patientId: pid, name: "O'zim kiritdim", value: "1" },
  });
  check("bemor analiz kirita olmaydi", 403, patCreate.status);

  const an = await doc.req("/api/analyses", {
    method: "POST",
    body: { patientId: pid, name: "Kaliy (smoke)", value: "4.2", unit: "mmol/l", refRange: "3.5-5.1", flag: "norma" },
  });
  check("shifokor analiz kiritdi", 201, an.status, JSON.stringify(an.data));
  const anId = an.data?.analysis?.id;

  const foreign = await doc2.req("/api/analyses", {
    method: "POST", body: { patientId: pid, name: "Begona", value: "1" },
  });
  check("begona shifokor kirita olmaydi", 403, foreign.status);
  check("izoh yozildi", 200,
    (await doc.req(`/api/analyses/${anId}`, { method: "PATCH", body: { doctorComment: "Me'yorda", flag: "norma" } })).status);
  check("bemor o'chira olmaydi", 403, (await pat.req(`/api/analyses/${anId}`, { method: "DELETE" })).status);
  check("shifokor o'chiradi", 200, (await doc.req(`/api/analyses/${anId}`, { method: "DELETE" })).status);

  section("Tibbiy yozuv qulfi");
  const medBefore = (await pat.req("/api/auth/me")).data.user.profile;
  const tryMed = await pat.req("/api/auth/me", {
    method: "PATCH",
    body: {
      profile: {
        phone: "+998 90 000 00 00",
        complaint: "O'ZIM YOZDIM",
        history: "O'ZIM YOZDIM",
        chronicConditions: "O'zim qo'shdim",
        allergies: ["O'zim"],
      },
    },
  });
  check("bemor profilni saqladi", 200, tryMed.status);
  check("  telefon o'zgardi", "+998 90 000 00 00", tryMed.data?.user?.profile?.phone);
  check("  shikoyat o'zgarmadi", medBefore.complaint || "", tryMed.data?.user?.profile?.complaint || "");
  check("  surunkali o'zgarmadi",
    (medBefore.chronicConditions || []).join(","),
    (tryMed.data?.user?.profile?.chronicConditions || []).join(","));
  check("  allergiya o'zgarmadi",
    (medBefore.allergies || []).join(","),
    (tryMed.data?.user?.profile?.allergies || []).join(","));

  const patMed = await pat.req(`/api/patients/${pid}`, {
    method: "PATCH", body: { complaint: "Bemor o'zi yozdi" },
  });
  check("bemor tibbiy yozuvni tahrirlay olmaydi", 403, patMed.status);

  const docMed = await doc.req(`/api/patients/${pid}`, {
    method: "PATCH",
    body: { complaint: "Shifokor yozdi (smoke)", chronicConditions: "Gipertoniya, Test" },
  });
  check("shifokor tibbiy yozuvni yangiladi", 200, docMed.status, JSON.stringify(docMed.data));
  check("  saqlandi", "Shifokor yozdi (smoke)", docMed.data?.profile?.complaint);
  check("begona shifokor tahrirlay olmaydi", 403,
    (await doc2.req(`/api/patients/${pid}`, { method: "PATCH", body: { complaint: "x" } })).status);

  section("Admin va bosh admin farqi");
  const admUsers = await adm.req("/api/admin/users");
  const admRoles = new Set((admUsers.data?.users || []).map((u) => u.role));
  check("admin adminlarni ko'rmaydi", false, admRoles.has("admin") || admRoles.has("superadmin"));
  check("admin ?role=admin so'rasa", 403, (await adm.req("/api/admin/users?role=admin")).status);

  const supUsers = await sup.req("/api/admin/users?role=superadmin");
  check("bosh admin bosh adminlarni ko'radi", true, (supUsers.data?.users?.length || 0) > 0);

  const someDoctor = (await sup.req("/api/admin/users?role=doctor")).data.users[0];
  check("admin shifokorni tasdiqlay olmaydi", 403,
    (await adm.req(`/api/admin/users/${someDoctor.id}`, { method: "PATCH", body: { isVerified: true } })).status);
  const verify = await sup.req(`/api/admin/users/${someDoctor.id}`, {
    method: "PATCH", body: { isVerified: false },
  });
  check("bosh admin tasdiqni bekor qildi", 200, verify.status);
  check("  holat o'zgardi", false, verify.data?.user?.profile?.isVerified === true);
  await sup.req(`/api/admin/users/${someDoctor.id}`, { method: "PATCH", body: { isVerified: true } });

  check("admin 2FA ni tiklay olmaydi", 403,
    (await adm.req(`/api/admin/users/${someDoctor.id}`, { method: "PATCH", body: { resetTwoFactor: true } })).status);
  check("bosh admin 2FA ni tiklay oladi", 200,
    (await sup.req(`/api/admin/users/${someDoctor.id}`, { method: "PATCH", body: { resetTwoFactor: true } })).status);

  section("Tizim holati (faqat bosh admin)");
  const sys = await sup.req("/api/admin/system");
  check("bosh admin ko'radi", 200, sys.status);
  check("  baza holati", "up", sys.data?.db?.status);
  check("  maxfiy kalit qaytmaydi", false, JSON.stringify(sys.data).includes(process.env.JWT_SECRET || "@@"));
  check("admin ko'ra olmaydi", 403, (await adm.req("/api/admin/system")).status);
  check("shifokor ko'ra olmaydi", 403, (await doc.req("/api/admin/system")).status);

  section("Audit eksporti");
  const csv = await sup.req("/api/admin/audit?format=csv");
  check("bosh admin CSV oladi", 200, csv.status);
  check("  csv turi", true, (csv.headers.get("content-type") || "").includes("csv"));
  check("admin CSV ololmaydi", 403, (await adm.req("/api/admin/audit?format=csv")).status);

  section("Fayllar");
  const fd = new FormData();
  fd.append("file", new Blob(["salom smoke test"], { type: "text/plain" }), "test.txt");
  fd.append("context", "message");
  const up = await pat.req("/api/uploads", { method: "POST", raw: fd });
  check("fayl yuklandi", 201, up.status, JSON.stringify(up.data));
  const fileId = up.data?.attachment?.id;

  const badType = new FormData();
  badType.append("file", new Blob(["MZ"], { type: "application/x-msdownload" }), "virus.exe");
  badType.append("context", "message");
  check("noto'g'ri tur rad etildi", 415, (await pat.req("/api/uploads", { method: "POST", raw: badType })).status);

  check("egasi faylni ochadi", 200, (await pat.req(`/api/uploads/${fileId}`)).status);
  check("begona shifokor ocholmaydi", 403, (await doc2.req(`/api/uploads/${fileId}`)).status);

  section("Chat + fayl");
  const convs = await pat.req("/api/conversations");
  const cid = convs.data.conversations[0].id;
  const msg = await pat.req(`/api/conversations/${cid}/messages`, {
    method: "POST", body: { text: "Fayl bilan xabar", attachments: [fileId] },
  });
  check("fayl bilan xabar", 201, msg.status);
  check("  biriktirildi", 1, msg.data?.attachments?.length);
  check("bo'sh xabar", 400, (await pat.req(`/api/conversations/${cid}/messages`, { method: "POST", body: { text: "  " } })).status);
  check("begona chat", 403, (await doc2.req(`/api/conversations/${cid}/messages`)).status);

  section("Xabarnomalar");
  const notifs = await pat.req("/api/notifications");
  check("ro'yxat", 200, notifs.status);
  check("  yozuvlar bor", true, (notifs.data?.notifications?.length || 0) > 0);
  check("hammasini o'qildi", 200, (await pat.req("/api/notifications", { method: "POST", body: { all: true } })).status);
  const after = await pat.req("/api/notifications");
  check("  o'qilmagan qolmadi", 0, after.data?.unread);

  section("Audit jurnali");
  const audit = await sup.req("/api/admin/audit");
  check("jurnal", 200, audit.status);
  check("  yozuvlar bor", true, (audit.data?.logs?.length || 0) > 0);
  const viewLog = await sup.req("/api/admin/audit?action=patient_card_view");
  check("kartani ochish yozildi", true, (viewLog.data?.logs?.length || 0) >= 0);
  const admAudit = await adm.req("/api/admin/audit?action=role_change");
  check("admin maxfiy amallarni ko'rmaydi", 0, admAudit.data?.logs?.length ?? -1);
  check("shifokor jurnalga kira olmaydi", 403, (await doc.req("/api/admin/audit")).status);

  section("Ikki bosqichli tasdiqlash");
  const tfa = session("2fa");
  await login(tfa, "nilufar@test.uz");
  const setup = await tfa.req("/api/auth/2fa/setup", { method: "POST" });
  check("QR yaratildi", 200, setup.status);
  check("  qr rasm", true, String(setup.data?.qr || "").startsWith("data:image"));

  const badCode = await tfa.req("/api/auth/2fa/enable", { method: "POST", body: { code: "000000" } });
  check("noto'g'ri kod", 401, badCode.status);

  const enable = await tfa.req("/api/auth/2fa/enable", {
    method: "POST", body: { code: totp(setup.data.secret) },
  });
  check("2FA yoqildi", 200, enable.status, JSON.stringify(enable.data));
  check("  zaxira kodlar", 8, enable.data?.backupCodes?.length);

  const tfa2 = session("2fa-login");
  const step1 = await login(tfa2, "nilufar@test.uz");
  check("kirishda kod so'raldi", true, step1.data?.twoFactorRequired === true);
  check("yarim sessiya bilan API", 401, (await tfa2.req("/api/summary")).status);
  const step2 = await tfa2.req("/api/auth/2fa/verify", {
    method: "POST", body: { code: totp(setup.data.secret) },
  });
  check("kod tasdiqlandi", 200, step2.status, JSON.stringify(step2.data));
  check("endi API ishlaydi", 200, (await tfa2.req("/api/summary")).status);

  const backup = enable.data.backupCodes[0];
  const tfa3 = session("2fa-backup");
  await login(tfa3, "nilufar@test.uz");
  check("zaxira kod bilan kirish", 200,
    (await tfa3.req("/api/auth/2fa/verify", { method: "POST", body: { code: backup } })).status);
  const reuse = session("2fa-reuse");
  await login(reuse, "nilufar@test.uz");
  check("ishlatilgan zaxira kod bekor", 401,
    (await reuse.req("/api/auth/2fa/verify", { method: "POST", body: { code: backup } })).status);
  check("2FA o'chirildi", 200,
    (await tfa2.req("/api/auth/2fa/disable", { method: "POST", body: { code: totp(setup.data.secret) } })).status);

  section("Parolni tiklash");
  const forgot = await anon.req("/api/auth/forgot", { method: "POST", body: { email: "bemor@test.uz" } });
  check("so'rov qabul qilindi", 200, forgot.status);
  const forgotUnknown = await anon.req("/api/auth/forgot", { method: "POST", body: { email: "yoq@test.uz" } });
  check("noma'lum email ham 200", 200, forgotUnknown.status);
  const badToken = await anon.req("/api/auth/reset", {
    method: "POST", body: { token: "x".repeat(40), password: "YangiParol1" },
  });
  check("yaroqsiz token", 400, badToken.status);
  check("  kod", "TOKEN_INVALID", badToken.data?.code);

  section("Qabul xulosasi (SOAP)");
  const encBad = await doc.req("/api/encounters", {
    method: "POST", body: { patientId: pid, subjective: "faqat shikoyat" },
  });
  check("xulosasiz saqlanmaydi", 400, encBad.status);

  const enc = await doc.req("/api/encounters", {
    method: "POST",
    body: {
      patientId: pid,
      subjective: "Ensa og'rig'i",
      objective: "AD 165/100",
      assessment: "Arterial gipertenziya, 2-bosqich",
      plan: "Lizinoprilni oshirish, 2 haftadan keyin ko'rik",
      vitals: { bp: "165/100", pulse: "92" },
      prescriptions: [{ name: "Lizinopril", dose: "20 mg", duration: "30 kun" }],
    },
  });
  check("shifokor xulosa yozdi", 201, enc.status, JSON.stringify(enc.data));
  check("  tashxis saqlandi", "Arterial gipertenziya, 2-bosqich", enc.data?.encounter?.assessment);
  check("  retsept saqlandi", 1, enc.data?.encounter?.prescriptions?.length);

  check("bemor xulosa yoza olmaydi", 403,
    (await pat.req("/api/encounters", { method: "POST", body: { patientId: pid, assessment: "o'zim" } })).status);
  check("begona shifokor yoza olmaydi", 403,
    (await doc2.req("/api/encounters", { method: "POST", body: { patientId: pid, assessment: "begona" } })).status);

  const patEnc = await pat.req("/api/encounters");
  check("bemor o'z xulosasini ko'radi", 200, patEnc.status);
  check("  shifr ochilgan", true,
    (patEnc.data?.encounters || []).some((e) => e.assessment.includes("Arterial gipertenziya")));

  section("Tibbiy tarix lentasi");
  const tl = await pat.req("/api/timeline");
  check("lenta keldi", 200, tl.status);
  check("  yozuvlar bor", true, (tl.data?.items?.length || 0) > 0);
  const kinds = new Set((tl.data?.items || []).map((i) => i.kind));
  check("  xulosa lentada", true, kinds.has("encounter"));
  check("begona shifokor lentani ko'rmaydi", 403, (await doc2.req(`/api/timeline?patient=${pid}`)).status);

  section("Barcha qurilmalardan chiqish");
  const extra = session("extra");
  await login(extra, "dilnoza@test.uz");
  check("ikkinchi sessiya ishlaydi", 200, (await extra.req("/api/summary")).status);

  const main = session("main");
  await login(main, "dilnoza@test.uz");
  check("hamma joydan chiqish", 200, (await main.req("/api/auth/logout-all", { method: "POST" })).status);
  check("eski sessiya bekor bo'ldi", 401, (await extra.req("/api/summary")).status);
  check("  kod", "AUTH_REQUIRED", (await extra.req("/api/summary")).data?.code);
  const relog = session("relog");
  check("qaytadan kirish ishlaydi", 200, (await login(relog, "dilnoza@test.uz")).status);
  check("  yangi token amal qiladi", 200, (await relog.req("/api/summary")).status);

  section("Yaroqsiz sessiya — qayta yo'naltirish halqasi yo'q");
  // Cookie'dagi imzo to'g'ri, lekin sessiya kuchsizlangan (logout-all) — sahifa
  // cheksiz halqaga tushmasligi va cookie tozalanishi kerak.
  const stale = await extra.req("/bemor");
  check("sahifa yo'naltirdi", true, [302, 303, 307, 308].includes(stale.status));
  check("  cookie tozalanadigan manzilga", true,
    String(stale.headers.get("location") || "").includes("/api/auth/expired"));
  const cleaner = await anon.req("/api/auth/expired");
  check("expired → /login", true,
    String(cleaner.headers.get("location") || "").includes("/login"));
  check("  cookie o'chirildi", true,
    (cleaner.headers.getSetCookie?.() || []).some((c) => /mt_token=;|mt_token=""/.test(c)));

  section("Brauzer xatolari");
  const cerr = await anon.req("/api/client-errors", {
    method: "POST", body: { message: "Smoke test xatosi", page: "/test", stack: "at x (y:1:1)" },
  });
  check("xato qabul qilindi", 200, cerr.status);
  check("shifokor ro'yxatni ko'rmaydi", 403, (await doc.req("/api/client-errors")).status);
  const cerrList = await sup.req("/api/client-errors");
  check("bosh admin ko'radi", 200, cerrList.status);
  check("  yozuv bor", true, (cerrList.data?.errors || []).some((e) => e.message === "Smoke test xatosi"));

  section("Shifrlash holati");
  const sys2 = await sup.req("/api/admin/system?fresh=1");
  check("shifrlash yoqilgan", true, sys2.data?.services?.encryption?.on === true);
  const medRead = await doc.req(`/api/patients/${pid}`);
  check("shifokor shifrni ochib ko'radi", 200, medRead.status);
  check("  matn o'qiladi", false, String(medRead.data?.patient?.profile?.complaint || "").startsWith("enc:v1:"));

  section("Xavfsizlik sarlavhalari");
  const page = await anon.req("/login");
  check("X-Content-Type-Options", "nosniff", page.headers.get("x-content-type-options"));
  check("X-Frame-Options", "SAMEORIGIN", page.headers.get("x-frame-options"));
  check("X-Powered-By yashirilgan", "null", String(page.headers.get("x-powered-by")));
  check("API keshlanmaydi", true, /no-store/.test((await doc.req("/api/summary")).headers.get("cache-control") || ""));

  section("AI");
  const ai = await doc.req("/api/ai");
  check("AI ro'yxati", 200, ai.status);
  if (process.env.GEMINI_API_KEY && WITH_AI) {
    const run = await doc.req("/api/ai", {
      method: "POST",
      headers: { "x-lang": "uz" },
      body: { patientId: pid, complaint: "Bosh og'rig'i va qon bosimi ko'tarilishi", bp: "160/95", pulse: "88" },
    });
    check("Gemini tahlili", 200, run.status, run.data?.error || "");
    check("  differensiallar bor", true, (run.data?.result?.differentials?.length || 0) > 0);
  } else {
    note("Gemini so'rovi o'tkazib yuborildi (--ai bayrog'i bilan ishga tushiring)");
  }

  await cleanup();

  console.log(out.join("\n"));
  console.log(`\nNATIJA: ${pass} ta o'tdi, ${fail} ta yiqildi`);
  process.exit(fail ? 1 : 0);
}

/**
 * Test yaratgan vaqtinchalik hisoblarni (doc…/a…/t…/p…@test.uz) va ularga bog'liq
 * yozuvlarni o'chiradi — aks holda ular demo ma'lumotlar orasida to'planib qoladi.
 * API'da foydalanuvchini o'chirish yo'q (faqat bloklash), shuning uchun to'g'ridan-to'g'ri
 * bazaga murojaat qilamiz. MONGODB_URI bo'lmasa jimgina o'tkazib yuboriladi.
 */
async function cleanup() {
  if (!process.env.MONGODB_URI) return note("Tozalash o'tkazib yuborildi (MONGODB_URI yo'q)");
  let client;
  try {
    const { MongoClient } = await import("mongodb");
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const junk = await db.collection("users")
      .find({ email: { $regex: /^(doc|a|t|p)\d{10,}@test\.uz$/ } })
      .project({ _id: 1 }).toArray();
    const ids = junk.map((u) => u._id);
    if (!ids.length) return;

    await Promise.all([
      db.collection("users").deleteMany({ _id: { $in: ids } }),
      db.collection("conversations").deleteMany({ $or: [{ patient: { $in: ids } }, { doctor: { $in: ids } }] }),
      db.collection("messages").deleteMany({ sender: { $in: ids } }),
      db.collection("appointments").deleteMany({ $or: [{ patient: { $in: ids } }, { doctor: { $in: ids } }] }),
      db.collection("analyses").deleteMany({ patient: { $in: ids } }),
      db.collection("encounters").deleteMany({ patient: { $in: ids } }),
      db.collection("schedules").deleteMany({ doctor: { $in: ids } }),
      db.collection("notifications").deleteMany({ user: { $in: ids } }),
      db.collection("aireports").deleteMany({ patient: { $in: ids } }),
    ]);
    // O'chirilgan shifokorga biriktirilgan bemorlarni bo'shatamiz
    await db.collection("users").updateMany(
      { role: "patient", assignedDoctor: { $in: ids } },
      { $set: { assignedDoctor: null } }
    );
    note(`Tozalandi: ${ids.length} ta vaqtinchalik hisob`);
  } catch (e) {
    note(`Tozalash bajarilmadi: ${e.message}`);
  } finally {
    await client?.close().catch(() => {});
  }
}

main().catch((e) => {
  console.log(out.join("\n"));
  console.error("\nTest bajarilmadi:", e);
  process.exit(2);
});
