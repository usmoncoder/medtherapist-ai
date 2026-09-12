// node --env-file=.env scripts/seed.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const oid = () => new mongoose.Types.ObjectId();
const at = (d, h = 9, m = 0) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(h, m, 0, 0);
  return t;
};
const workweek = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, from: "09:00", to: "17:00" }));

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  const C = (n) => db.collection(n);

  const hash = await bcrypt.hash("Parol12345", 10);
  const now = new Date();
  const stamp = { createdAt: now, updatedAt: now };

  const superId = oid();
  const adminId = oid();
  const doc1 = oid();
  const doc2 = oid();
  const doc3 = oid();

  const patients = [
    {
      _id: oid(), fullName: "Aziz Rahimov", email: "bemor@test.uz", doctor: doc1,
      birthDate: new Date("1981-04-12"), gender: "erkak", phone: "+998 91 234 56 78",
      bloodType: "O+", allergies: ["Penitsillin"], chronicConditions: ["Gipertoniya"],
      complaint: "Ensa og'rig'i, holsizlik, ko'z oldi qorong'ilashishi",
      history: "5 yildan beri arterial gipertenziya, muntazam dori qabul qiladi",
    },
    {
      _id: oid(), fullName: "Nilufar Abdullayeva", email: "nilufar@test.uz", doctor: doc1,
      birthDate: new Date("2001-02-03"), gender: "ayol", phone: "+998 90 123 45 67",
      bloodType: "A+", allergies: ["Yo'q"], chronicConditions: ["Migren"],
      complaint: "Bosh og'rig'i, ko'ngil aynishi, yorug'likka sezuvchanlik",
      history: "2024-yildan beri davriy migren xurujlari",
    },
    {
      _id: oid(), fullName: "Dilnoza Jabborova", email: "dilnoza@test.uz", doctor: doc2,
      birthDate: new Date("1997-09-21"), gender: "ayol", phone: "+998 97 567 89 01",
      bloodType: "B+", allergies: ["Laktoza"], chronicConditions: ["Temir tanqisligi anemiyasi"],
      complaint: "Tez charchash, bosh aylanishi",
      history: "Hb 96 g/l, temir preparatlari kursi",
    },
    {
      _id: oid(), fullName: "Bekzod Toshpo'latov", email: "bekzod@test.uz", doctor: null,
      birthDate: new Date("1975-11-05"), gender: "erkak", phone: "+998 94 456 78 90",
      bloodType: "AB+", allergies: ["Chang"], chronicConditions: ["Bronxit"],
      complaint: "Balg'amli yo'tal, hansirash",
      history: "Chekuvchi, 20 yil staj",
    },
    {
      _id: oid(), fullName: "Madina Normurodova", email: "madina@test.uz", doctor: null,
      birthDate: new Date("1988-06-14"), gender: "ayol", phone: "+998 99 789 01 23",
      bloodType: "O-", allergies: ["Yo'q"], chronicConditions: [],
      complaint: "Isitma, tomoq og'rig'i",
      history: "Yil davomida 2 marta ARVI",
    },
  ];

  const emails = [
    "bosh@test.uz", "admin@test.uz",
    "shifokor@test.uz", "shifokor2@test.uz", "shifokor3@test.uz",
    ...patients.map((p) => p.email),
  ];

  const old = await C("users").find({ email: { $in: emails } }).project({ _id: 1 }).toArray();
  const oldIds = old.map((u) => u._id);
  await Promise.all([
    C("users").deleteMany({ email: { $in: emails } }),
    C("conversations").deleteMany({ $or: [{ patient: { $in: oldIds } }, { doctor: { $in: oldIds } }] }),
    C("messages").deleteMany({ sender: { $in: oldIds } }),
    C("appointments").deleteMany({ $or: [{ patient: { $in: oldIds } }, { doctor: { $in: oldIds } }] }),
    C("analyses").deleteMany({ patient: { $in: oldIds } }),
    C("schedules").deleteMany({ doctor: { $in: oldIds } }),
    C("notifications").deleteMany({ user: { $in: oldIds } }),
    C("auditlogs").deleteMany({ actor: { $in: oldIds } }),
    C("aireports").deleteMany({ patient: { $in: oldIds } }),
  ]);

  const staff = (id, fullName, email, role, profile) => ({
    _id: id, fullName, email, passwordHash: hash, role, isActive: true,
    assignedDoctor: null, twoFactor: { enabled: false },
    ...(role === "doctor" ? { doctorProfile: profile } : {}),
    ...stamp,
  });

  await C("users").insertMany([
    staff(superId, "Umidjon Rahmatov", "bosh@test.uz", "superadmin"),
    staff(adminId, "Gulnora Sattorova", "admin@test.uz", "admin"),
    staff(doc1, "Dr. Nodira Karimova", "shifokor@test.uz", "doctor", {
      specialty: "Terapevt", department: "Terapiya", experienceYears: 8,
      clinic: "MedTherapist klinikasi", room: "204-xona", phone: "+998 71 200 00 04",
      bio: "Terapevt, arterial gipertenziya va metabolik sindrom bo'yicha ixtisoslashgan.",
      isVerified: true, licenseNumber: "UZ-TER-004821",
    }),
    staff(doc2, "Dr. Sardor Yusupov", "shifokor2@test.uz", "doctor", {
      specialty: "Kardiolog", department: "Kardiologiya", experienceYears: 12,
      clinic: "MedTherapist klinikasi", room: "301-xona", phone: "+998 71 200 00 03",
      bio: "Kardiolog, yurak yetishmovchiligi va aritmiyalar bo'yicha tajribaga ega.",
      isVerified: true, licenseNumber: "UZ-CAR-001204",
    }),
    staff(doc3, "Dr. Kamola Ergasheva", "shifokor3@test.uz", "doctor", {
      specialty: "Endokrinolog", department: "Endokrinologiya", experienceYears: 6,
      clinic: "MedTherapist klinikasi", room: "212-xona", phone: "+998 71 200 00 12",
      bio: "Endokrinolog, qandli diabet va qalqonsimon bez kasalliklari.",
      isVerified: true, licenseNumber: "UZ-END-003390",
    }),
    ...patients.map((p) => ({
      _id: p._id, fullName: p.fullName, email: p.email, passwordHash: hash,
      role: "patient", isActive: true,
      assignedDoctor: p.doctor, assignedBy: p.doctor ? adminId : null,
      assignedAt: p.doctor ? now : null,
      twoFactor: { enabled: false },
      patientProfile: {
        birthDate: p.birthDate, gender: p.gender, phone: p.phone,
        address: "Toshkent sh., Chilonzor t.", bloodType: p.bloodType,
        allergies: p.allergies, chronicConditions: p.chronicConditions,
        complaint: p.complaint, history: p.history, medications: [],
        cardNumber: `MT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      },
      ...stamp,
    })),
  ]);

  // Shifokorlarning ish jadvali
  await C("schedules").insertMany([
    { _id: oid(), doctor: doc1, slotMin: 30, workdays: workweek, daysOff: [], ...stamp },
    { _id: oid(), doctor: doc2, slotMin: 20, workdays: [1, 3, 5].map((weekday) => ({ weekday, from: "10:00", to: "16:00" })), daysOff: [], ...stamp },
    { _id: oid(), doctor: doc3, slotMin: 30, workdays: [2, 4].map((weekday) => ({ weekday, from: "09:00", to: "14:00" })), daysOff: [], ...stamp },
  ]);

  // Biriktirilgan bemorlar uchun suhbat
  const assigned = patients.filter((p) => p.doctor);
  const convs = assigned.map((p) => ({
    _id: oid(), patient: p._id, doctor: p.doctor,
    unread: { patient: 0, doctor: 0 }, ...stamp,
  }));
  await C("conversations").insertMany(convs);

  const c0 = convs[0];
  const m1 = { _id: oid(), conversation: c0._id, sender: patients[0]._id, text: "Assalomu alaykum, doktor. Qon bosimim yana ko'tarildi.", attachments: [], ...stamp };
  const m2 = { _id: oid(), conversation: c0._id, sender: doc1, text: "Va alaykum assalom. Bugungi ko'rsatkichni yozib yuboring, tuz iste'molini ham kamaytiring.", attachments: [], ...stamp };
  await C("messages").insertMany([m1, m2]);
  await C("conversations").updateOne(
    { _id: c0._id },
    { $set: { lastMessage: { text: m2.text, at: now, from: doc1 }, "unread.patient": 1 } }
  );

  // Navbatlar — jadvaldagi haqiqiy slotlarga tushadigan vaqtlar
  const nextWeekday = (target) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 8; i++) {
      const x = new Date(d.getTime() + i * 864e5);
      if (x.getDay() === target) return x;
    }
    return new Date(d.getTime() + 864e5);
  };
  const slotOn = (weekday, h, m) => {
    const d = nextWeekday(weekday);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await C("appointments").insertMany([
    { _id: oid(), patient: patients[0]._id, doctor: doc1, startsAt: slotOn(1, 9, 30), durationMin: 30, reason: "Qon bosimi nazorati", status: "tasdiqlangan", doctorNote: "204-xonaga keling", ...stamp },
    { _id: oid(), patient: patients[1]._id, doctor: doc1, startsAt: slotOn(3, 11, 0), durationMin: 30, reason: "Migren xuruji tez-tez takrorlanmoqda", status: "kutilmoqda", ...stamp },
    { _id: oid(), patient: patients[2]._id, doctor: doc2, startsAt: slotOn(5, 10, 20), durationMin: 20, reason: "Anemiya nazorati", status: "kutilmoqda", ...stamp },
    { _id: oid(), patient: patients[0]._id, doctor: doc1, startsAt: at(-7, 10, 0), durationMin: 30, reason: "Birlamchi ko'rik", status: "yakunlangan", ...stamp },
  ]);

  // Analizlarni shifokor kiritadi
  await C("analyses").insertMany([
    { _id: oid(), patient: patients[0]._id, doctor: doc1, name: "Umumiy xolesterin", value: "6.1", unit: "mmol/l", refRange: "< 5.2", flag: "yuqori", takenAt: at(-5), doctorComment: "Yuqori — parhez va takroriy tahlil kerak", attachments: [], ...stamp },
    { _id: oid(), patient: patients[0]._id, doctor: doc1, name: "Kreatinin", value: "88", unit: "mkmol/l", refRange: "62–106", flag: "norma", takenAt: at(-5), doctorComment: "", attachments: [], ...stamp },
    { _id: oid(), patient: patients[0]._id, doctor: doc1, name: "Glyukoza (nahorda)", value: "7.2", unit: "mmol/l", refRange: "3.9–6.1", flag: "yuqori", takenAt: at(-5), doctorComment: "HbA1c topshirish kerak", attachments: [], ...stamp },
    { _id: oid(), patient: patients[2]._id, doctor: doc2, name: "Gemoglobin", value: "96", unit: "g/l", refRange: "120–150", flag: "past", takenAt: at(-3), doctorComment: "", attachments: [], ...stamp },
    { _id: oid(), patient: patients[2]._id, doctor: doc2, name: "Ferritin", value: "12", unit: "ng/ml", refRange: "30–300", flag: "kritik", takenAt: at(-3), doctorComment: "Temir preparatlarini boshlaymiz", attachments: [], ...stamp },
  ]);

  // Administratorga biriktirilmagan bemorlar haqida xabarnoma
  await C("notifications").insertMany(
    patients.filter((p) => !p.doctor).flatMap((p) =>
      [adminId, superId].map((u) => ({
        _id: oid(), user: u, type: "assignment",
        titleKey: "notif.newPatientRegistered", vars: { name: p.fullName },
        page: "assign", tone: "blue", read: false, createdAt: now,
      }))
    )
  );

  // Smoke test yaratgan vaqtinchalik hisoblarni tozalaymiz (doc17..., a17..., t17...@test.uz)
  const junk = await C("users").deleteMany({ email: { $regex: /^(doc|a|t|p)\d{10,}@test\.uz$/ } });
  if (junk.deletedCount) console.log(`Test hisoblari tozalandi: ${junk.deletedCount}`);

  // Yetim havolalar: o'chirilgan shifokorga biriktirilgan bemorlarni bo'shatamiz
  const doctorIds = (await C("users").find({ role: "doctor" }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const orphans = await C("users").updateMany(
    { role: "patient", assignedDoctor: { $ne: null, $nin: doctorIds } },
    { $set: { assignedDoctor: null } }
  );
  if (orphans.modifiedCount) console.log(`Yetim biriktiruvlar tozalandi: ${orphans.modifiedCount}`);

  console.log("Demo ma'lumotlar tayyor — parol: Parol12345\n");
  console.log("  Bosh administrator : bosh@test.uz");
  console.log("  Administrator      : admin@test.uz");
  console.log("  Shifokorlar        : shifokor@test.uz, shifokor2@test.uz, shifokor3@test.uz");
  console.log("  Bemorlar           : bemor@test.uz, nilufar@test.uz, dilnoza@test.uz");
  console.log("  Biriktirilmagan    : bekzod@test.uz, madina@test.uz");
  await mongoose.disconnect();
})();
