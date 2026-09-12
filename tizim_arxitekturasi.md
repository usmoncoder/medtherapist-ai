# MedTherapist AI — tizim arxitekturasi

> Bu hujjat loyihaning to'liq texnik tavsifi. Kod bazasini ko'rmagan odam (yoki AI model)
> shu hujjatni o'qib tizim qanday qurilganini, qaysi qism nima qilishini va ma'lumot
> qanday oqishini tushunishi kerak.

**Loyiha nima:** ko'p shifokorli klinika uchun raqamli platforma. To'rt xil rol bor —
bemor, shifokor, administrator va bosh administrator. Administrator bemorlarni
shifokorlarga biriktiradi; shifokor o'z ish jadvalini belgilaydi, bemorlarga analiz
kiritadi, qabuldan keyin **SOAP xulosasini** yozadi va ularni kuzatadi; bemor uydan turib
shifokorning bo'sh vaqtidan navbat oladi, natijalarini va **yagona tibbiy tarixini**
ko'radi, shifokori bilan yopiq chatda yozishadi. Bosh administrator butun
tizim ustidan nazorat qiladi: rollarni o'zgartiradi, hisoblarni bloklaydi va audit
jurnalini to'liq ko'radi.

**Til:** interfeys uch tilda — o'zbekcha (lotin), o'zbekcha (kirill), ruscha.

---

## 1. Texnologiyalar

| Qatlam | Texnologiya | Izoh |
|---|---|---|
| Runtime | Node.js 20+ | `server.js` — maxsus HTTP server |
| Framework | Next.js 15 (App Router) | Frontend + Backend bitta loyihada |
| UI | React 19 | Client komponentlar + uchta server sahifa |
| Uslub | Sof CSS (`globals.css`) | CSS o'zgaruvchilariga asoslangan dizayn tizimi |
| Baza | MongoDB Atlas + Mongoose 8 | Bulutdagi baza |
| Realtime | Socket.io 4 | Next.js bilan **bitta portda** |
| Auth | `jose` (JWT) + `bcryptjs` | httpOnly cookie, 7 kun |
| 2FA | `node:crypto` (RFC 6238 TOTP) + `qrcode` | Tashqi TOTP kutubxonasisiz |
| Validatsiya | `zod` | Har bir API kirish nuqtasida |
| Pochta | `nodemailer` | Parolni tiklash; SMTP bo'lmasa logga yozadi |
| Kesh/limit | `ioredis` (ixtiyoriy) | `REDIS_URL` berilsa taqsimlangan rate limit |
| AI | Google Gemini API | JSON schema bilan tuzilgan javob |
| Shifrlash | `node:crypto` AES-256-GCM | Klinik matn maydonlari bazada shifrlangan |
| CI | GitHub Actions + mongo:7 | i18n, audit, build, seed, 141 smoke test |

**Muhim arxitektura qarori:** Next.js o'zining standart serveri o'rniga `server.js` orqali
ishga tushiriladi — Socket.io serveri bilan **bitta HTTP server va bitta portni** bo'lishish
uchun. Shu tufayli chat va xabarnomalar sahifa bilan bir xil origin'da bo'ladi, cookie'lar
avtomatik ishlaydi va CORS muammosi yo'q.

---

## 2. Rollar va ularning huquqlari

```
superadmin  ⊃  admin  ⊃  doctor  ⊃  patient
```

| Rol | Nima qila oladi |
|---|---|
| **patient** (bemor) | Birinchi kirganda 3 qadamli **onboarding**; faqat **shaxsiy** ma'lumotini tahrirlaydi (ism, tug'ilgan sana, jins, telefon, manzil, qon guruhi); biriktirilgan shifokorning bo'sh vaqtidan navbat oladi va bekor qiladi; analizlari, qabul xulosalari, tibbiy yozuvi va **yagona tibbiy tarixini** **faqat ko'radi**; shifokori bilan chat + fayl; 2FA + "barcha qurilmalardan chiqish" |
| **doctor** (shifokor) | O'z ish jadvali; bemorlari ro'yxati va kartasi; navbatlarni tasdiqlash/rad etish/yakunlash; **analiz kiritish**, **SOAP qabul xulosasi yozish** va **bemorning tibbiy yozuvini tahrirlash**; fayl yuklash; kartani chop etish; AI tahlil; 2FA |
| **admin** (administrator) | Bemorlarni shifokorlarga biriktirish; **faqat bemor va shifokor** hisoblarini ko'rish/yaratish/bloklash; barcha navbatlar; audit jurnali (maxfiy amallardan tashqari, IP'siz) |
| **superadmin** (bosh administrator) | Hammasi + **administrator yaratish va ko'rish**; **rollarni o'zgartirish**; **shifokor litsenziyasini tasdiqlash**; **birovning 2FA sini majburan tiklash**; **Tizim holati** sahifasi; **mijoz (brauzer) xatolari jurnali**; to'liq audit jurnali (IP bilan) va **CSV eksport** |

### Administrator va bosh administrator farqi — amalda

| Imkoniyat | admin | superadmin |
|---|:--:|:--:|
| Bemorni shifokorga biriktirish | ✅ | ✅ |
| Bemor/shifokor hisobini yaratish, bloklash | ✅ | ✅ |
| Ro'yxatda administratorlarni **ko'rish** | ❌ | ✅ |
| Administrator hisobini yaratish | ❌ | ✅ |
| Rolni o'zgartirish | ❌ | ✅ |
| Shifokor litsenziyasini tasdiqlash | ❌ | ✅ |
| Birovning 2FA sini tiklash | ❌ | ✅ |
| "Hodimlar" bo'limi | ❌ | ✅ |
| "Tizim holati" bo'limi | ❌ | ✅ |
| Audit: `role_change`, `user_deactivate`, `2fa_disable` yozuvlari | ❌ | ✅ |
| Audit: IP manzil va CSV eksport | ❌ | ✅ |
| Mijoz xatolari jurnali (`/api/client-errors`) | ❌ | ✅ |

Tekshiruvlar server tomonda: `canManage()` (`src/lib/roles.js`), `/api/admin/users` dagi
`visible` ro'yxati va har bir maxsus amal oldidagi `isSuper` sharti. Menyu farqi — faqat
ko'rinish, himoya API darajasida.

**Muhim qoidalar:**
- Ochiq ro'yxatdan o'tish (`/register`) faqat **bemor** yaratadi. Shifokor, admin va bosh
  admin hisoblari faqat admin panelda yaratiladi.
- Bemor o'ziga shifokor tanlay olmaydi — buni administrator qiladi (`/api/admin/assign`).
- Admin faqat `patient` va `doctor` rollarini boshqaradi; `admin`/`superadmin` bilan ishlash
  faqat bosh administrator qo'lida (`canManage()` — `src/lib/roles.js`).
- Hech kim o'z hisobini bloklay olmaydi va rolini o'zgartira olmaydi (`SELF_ACTION`).
- Tizimda kamida bitta faol bosh administrator qolishi shart (`LAST_SUPERADMIN`).

---

## 3. Papkalar tuzilishi — frontend va backend

```
medtherapist/
├── server.js                  ⚙️  BACKEND — kirish nuqtasi (Next + Socket.io + Mongo
│                                  + navbat eslatmasi rejasi)
├── next.config.mjs            ⚙️  BACKEND — xavfsizlik sarlavhalari
├── .env                       ⚙️  Maxfiy kalitlar (git'ga tushmaydi)
├── uploads/                   ⚙️  Yuklangan fayllar (git'ga tushmaydi)
├── backups/                   ⚙️  `npm run backup` arxivlari (git'ga tushmaydi)
├── .github/workflows/ci.yml   ⚙️  CI: mongo:7, npm audit, i18n, build, seed, smoke
│
├── scripts/
│   ├── seed.js                ⚙️  Demo ma'lumotlar (4 rol, 3 shifokor, jadvallar)
│   ├── smoke-test.mjs         ⚙️  Uchidan-uchiga avtotest (145 ta tekshiruv)
│   ├── check-i18n.mjs         ⚙️  Uch tilda kalit to'liqligi (CI da majburiy)
│   ├── backup.mjs             ⚙️  Bazani JSON arxivga saqlash
│   └── restore.mjs            ⚙️  Arxivdan tiklash
│
└── src/
    ├── middleware.js          ⚙️  Edge middleware — rol bo'yicha marshrut himoyasi
    │
    ├── models/                ⚙️  Mongoose sxemalari (13 ta)
    │   ├── registry.js            hamma modelni import qiladi — populate() sinmasin
    │   ├── User.js                4 rol, ichki profillar, assignedDoctor, twoFactor,
    │   │                          tokenVersion
    │   ├── Conversation.js        bemor–shifokor juftligi uchun chat
    │   ├── Message.js             chat xabari + attachments[]
    │   ├── Appointment.js         navbat (so'rov → tasdiq → yakun) + reminderSentAt
    │   ├── Analysis.js            analiz (doctor kiritadi, flag: norma/yuqori/past/kritik)
    │   ├── Encounter.js           SOAP qabul xulosasi + ko'rsatkichlar (vitals)
    │   ├── Attachment.js          yuklangan fayl metama'lumoti
    │   ├── Schedule.js            shifokorning haftalik ish vaqti + dam olish kunlari
    │   ├── Notification.js        xabarnoma (i18n kaliti bilan saqlanadi)
    │   ├── AuditLog.js            kim, qachon, nimaga tegdi (TTL 2 yil)
    │   ├── ClientError.js         brauzerda yuz bergan xato (dedup, TTL 30 kun)
    │   ├── PasswordResetToken.js  parol tiklash tokeni (sha256, TTL)
    │   └── AiReport.js            Gemini tahlili natijasi
    │
    ├── lib/
    │   ├── db.js              ⚙️  MongoDB ulanishi (global keshlangan) + registry
    │   ├── auth.js jwt.js     ⚙️  parol hash + JWT
    │   ├── session.js         ⚙️  sessiya + 2FA yarim sessiyasi
    │   ├── tokenVersion.js    ⚙️  "barcha qurilmalardan chiqish" (60s kesh)
    │   ├── pageUser.js        ⚙️  server sahifalari uchun foydalanuvchi + halqa himoyasi
    │   ├── crypto.js          ⚙️  AES-256-GCM maydon shifrlash (enc:v1:)
    │   ├── cookies.js         ⚙️  cookie sozlamasi (COOKIE_SECURE bilan)
    │   ├── roles.js           ⚙️  rol ierarxiyasi, canManage()
    │   ├── http.js            ⚙️  route() o'ramchisi: auth + rol + DB + xatolar
    │   ├── errors.js          ⚙️  barcha xato kodlari (45+)
    │   ├── schemas.js         ⚙️  zod validatsiya sxemalari
    │   ├── access.js          ⚙️  obyekt egaligi tekshiruvlari
    │   ├── ratelimit.js       ⚙️  xotira yoki Redis
    │   ├── audit.js           ⚙️  audit yozuvi + ACTIONS ro'yxati (31 ta)
    │   ├── notify.js          ⚙️  xabarnoma + socket push
    │   ├── totp.js            ⚙️  RFC 6238 TOTP (kutubxonasiz)
    │   ├── mailer.js          ⚙️  nodemailer, SMTP bo'lmasa logga
    │   ├── uploads.js         ⚙️  disk saqlash, MIME va hajm nazorati
    │   ├── logger.js          ⚙️  struktura log
    │   ├── realtime.js        ⚙️  socket xonalariga emit
    │   ├── gemini.js          ⚙️  Gemini klienti (model zaxira zanjiri)
    │   ├── api.js             🎨  FRONTEND — fetch o'ramchisi (get/post/patch/del)
    │   ├── useNotifications.js🎨  FRONTEND — xabarnoma hooki (API + socket)
    │   ├── reference.js       🎨  FRONTEND — protokollar/dorilar/FAQ (3 tilda)
    │   └── i18n/              🎨  FRONTEND — 704 kalit × 3 til (4 faylda)
    │
    ├── app/
    │   ├── api/               ⚙️  BACKEND — 37 ta endpoint (pastda ro'yxat)
    │   ├── layout.jsx         🎨  HTML karkas, mavzu/til init
    │   ├── globals.css        🎨  dizayn tizimi (~1470 satr, chop etish uslublari bilan)
    │   ├── icon.svg           🎨  rangli favicon
    │   ├── page.jsx           🎨  "/" → rolga qarab yo'naltiradi
    │   ├── login|register|forgot|reset/page.jsx
    │   ├── bemor/page.jsx     🎨  bemor kabineti
    │   ├── shifokor/page.jsx  🎨  shifokor kabineti
    │   └── admin/page.jsx     🎨  admin va bosh admin paneli
    │
    └── components/            🎨  FRONTEND
        ├── Providers.jsx          I18nProvider + ToastProvider + ErrorBoundary
        ├── ErrorBoundary.jsx      xatoni tutadi → /api/client-errors ga yuboradi
        ├── Logo.jsx               rangli gradient logotip + Wordmark
        ├── ColorIcon.jsx          23 ta rangli bo'lim ikonkasi
        ├── AppShell.jsx           sidebar, topbar, til, mavzu, xabarnomalar, qidiruv
        ├── ui.jsx                 Icon (40+), Avatar, Modal, Toast, Donut, Num (skeleton)…
        ├── AuthForm.jsx           kirish/ro'yxat + 2FA bosqichi
        ├── ForgotForm.jsx         parolni tiklashni so'rash
        ├── ResetForm.jsx          yangi parol o'rnatish
        ├── Timeline.jsx           yagona tibbiy tarix (navbat + analiz + xulosa)
        ├── EncounterForm.jsx      SOAP formasi (S/O/A/P + ko'rsatkichlar)
        ├── ScheduleEditor.jsx     shifokorning ish jadvali muharriri
        ├── TwoFactorCard.jsx      2FA yoqish/o'chirish
        ├── SessionsCard.jsx       "barcha qurilmalardan chiqish"
        ├── FileUploader.jsx       fayl yuklash
        ├── AiPanel.jsx            AI Assistant
        ├── Chat.jsx               real vaqtli chat + fayl
        │
        ├── PatientApp.jsx         bemor kabineti — faqat marshrutlash (346 satr)
        ├── patient/
        │   ├── Onboarding.jsx         3 qadamli birinchi sozlash
        │   ├── MyDoctor.jsx           shifokorim kartasi
        │   ├── QueueSection.jsx       navbat olish va tarix
        │   ├── AnalysesView.jsx       analizlar ro'yxati
        │   └── ProfileSection.jsx     profil (tibbiy blok faqat ko'rish uchun)
        │
        ├── DoctorApp.jsx          shifokor kabineti — marshrutlash (371 satr)
        ├── doctor/
        │   ├── PatientsSection.jsx    bemorlar jadvali
        │   ├── PatientCard.jsx        bemor kartasi + tibbiy forma + SOAP + chop etish
        │   ├── AppointmentsSection.jsx navbat qarorlari
        │   ├── StatsSection.jsx       ko'rsatkichlar
        │   ├── DrugsSection.jsx       dorilar ma'lumotnomasi
        │   └── DoctorProfile.jsx      shifokor profili
        │
        ├── AdminApp.jsx          admin paneli — marshrutlash (182 satr)
        └── admin/
            ├── Overview.jsx           KPI va diagrammalar
            ├── AssignSection.jsx      bemorni shifokorga biriktirish
            ├── UsersSection.jsx       hisoblar
            ├── ApptsSection.jsx       barcha navbatlar
            ├── AuditSection.jsx       audit jurnali (+CSV superadmin uchun)
            ├── StaffSection.jsx       hodimlar — faqat superadmin
            └── SystemSection.jsx      tizim holati + mijoz xatolari — superadmin
```

- 🎨 **Frontend** = `src/components/`, `src/app/*/page.jsx`, `layout.jsx`, `globals.css`,
  `src/lib/{i18n,api.js,reference.js,useNotifications.js}`
- ⚙️ **Backend** = `server.js`, `src/app/api/`, `src/models/`, `src/middleware.js`,
  `src/lib/` (qolgani), `scripts/`

Ular **faqat HTTP (`/api/...`) va Socket.io orqali** uchrashadi. Backend React komponentini
import qilmaydi, frontend Mongoose modelini import qilmaydi.

**Komponent bo'linishi:** uchta kabinet avval bitta-bitta yirik fayl edi (jami ~2900 satr).
Hozir har biri faqat marshrutlash bilan shug'ullanadi, bo'limlar esa `patient/`, `doctor/`,
`admin/` papkalarida alohida fayllarda (17 ta bo'lim fayli). Shu tufayli bir bo'limni
tahrirlash boshqasiga ta'sir qilmaydi va `Fast Refresh` ancha tez ishlaydi.

---

## 4. Ma'lumot modeli

### User (`users`)
Barcha rollar bitta modelda; `role` ajratadi.

| Maydon | Izoh |
|---|---|
| `fullName`, `email` (unique), `passwordHash` | bcrypt, 10 rounds |
| `role` | `patient` \| `doctor` \| `admin` \| `superadmin` |
| `isActive`, `lastSeenAt` | bloklangan hisob kira olmaydi |
| `assignedDoctor`, `assignedBy`, `assignedAt` | **faqat bemorda** — kim biriktirgani ham saqlanadi |
| `createdBy` | hisobni kim yaratgani |
| `twoFactor` | `{ enabled, secret, backupCodes[] (sha256), confirmedAt }` |
| `tokenVersion` | har "hammadan chiqish"da oshadi — eski JWT lar darhol kuchsizlanadi |


**Onboarding holati saqlanmaydi** — u profil to'ldirilganmi, shifokor biriktirilganmi va
birorta navbat bormi degan uchta shartdan hisoblanadi. Uchtasi bajarilgach yo'riqnoma
o'z-o'zidan yo'qoladi, ortiqcha maydon ham, migratsiya ham kerak emas.

| `patientProfile` | birthDate, gender, phone, address, bloodType, allergies[], chronicConditions[], complaint, history, medications[], cardNumber |
| `doctorProfile` | specialty, department, licenseNumber, experienceYears, clinic, room, phone, bio, isVerified, maxPatients |

`toPublic()` — parol va 2FA siri chiqmaydi; Mongoose subdocument oddiy JSON obyektga
aylantiriladi (aks holda React'ga serializatsiya rekursiyaga tushadi); bemor profilidagi
shifrlangan maydonlar shu yerda **ochiladi** (`decryptProfile`).

### Schedule (`schedules`)
`doctor` (unique), `slotMin` (10–120), `workdays[{weekday 0–6, from "HH:MM", to "HH:MM"}]`,
`daysOff[]` (YYYY-MM-DD). Bo'sh vaqtlar shu jadvaldan hisoblanadi.

### Tibbiy yozuv qulfi (muhim qoida)

Bemorning **klinik** ma'lumotini (`complaint`, `history`, `allergies`, `chronicConditions`)
faqat shifokor yozadi. Bemor o'z profilida ularni **ko'radi, lekin o'zgartira olmaydi**:

- `PATCH /api/auth/me` — bemor rolida bu maydonlar **e'tiborga olinmaydi** (server tomonda
  `pick()` bilan faqat shaxsiy maydonlar olinadi), shuning uchun so'rovni qo'lda yuborish ham
  natija bermaydi.
- `PATCH /api/patients/[id]` — tibbiy yozuvni faqat bog'liq shifokor (yoki administrator)
  o'zgartiradi; har bir o'zgarish `patient_medical_update` sifatida audit'ga tushadi va
  bemorga xabarnoma boradi.
- Frontend'da bemor profilida bu blok "Faqat ko'rish uchun" belgisi bilan chiqadi.

Sabab: klinik yozuvning yaxlitligi — tashxis va anamnez shifokorning mas'uliyati.

### Maydon darajasidagi shifrlash (`src/lib/crypto.js`)

Bemorning eng maxfiy erkin matnlari — `complaint` (shikoyat) va `history` (anamnez) —
bazada **ochiq matnda saqlanmaydi**. `ENCRYPTION_KEY` (32 bayt, hex) berilgan bo'lsa ular
AES-256-GCM bilan shifrlanadi:

```
enc:v1:<iv base64>:<authTag base64>:<shifrlangan matn base64>
```

- Yozishda `encryptProfile()`, o'qishda `decryptProfile()` — ikkisi ham `User` modeli
  ichida chaqiriladi, shuning uchun API va UI oddiy matn bilan ishlaydi.
- **Orqaga moslik:** prefiksi yo'q qiymat eski ochiq matn deb qabul qilinadi, shuning uchun
  kalitni keyin qo'shsa ham baza sinmaydi (yangi yozuvlar shifrlanadi).
- Kalit bo'lmasa shifrlash o'chadi va "Tizim holati" sahifasida bu ogohlantirish sifatida
  ko'rinadi.
- Kalit yo'qolsa shifrlangan matnni tiklash **mumkin emas** — `.env` va zaxira nusxasi
  alohida saqlanishi kerak.

### Encounter (`encounters`) — SOAP qabul xulosasi

Shifokor qabuldan keyin to'ldiradigan klinik yozuv. Tuzilishi xalqaro **SOAP** standartida:

| Maydon | SOAP | Izoh |
|---|---|---|
| `subjective` | **S** | bemor shikoyati, o'z so'zlari bilan |
| `objective` | **O** | ko'rik va tekshiruv natijasi |
| `assessment` | **A** | shifokor xulosasi / tashxis |
| `plan` | **P** | davolash va kuzatuv rejasi |
| `vitals` | — | `{bp, pulse, temp, weight}` — qon bosimi, puls, harorat, vazn |
| `prescriptions[]` | — | `{name, dose, duration, note}` — tayinlangan dorilar |
| `followUpAt` | — | keyingi ko'rik sanasi |
| `patient`, `doctor`, `appointment` | — | kim, kimga, qaysi navbat bo'yicha |

- Yozuvni **faqat** bemorga bog'liq shifokor yarata oladi (`assertDoctorLinkedToPatient`).
- Navbat ID si berilsa o'sha navbat avtomatik `yakunlangan` holatiga o'tadi.
- Bemor xulosani ko'radi, lekin tahrirlay olmaydi; yaratilishi audit'ga tushadi va bemorga
  xabarnoma boradi.

### ClientError (`clienterrors`)

Brauzerda yuz bergan JS xatosi: `message`, `stack`, `page`, `role`, `userAgent`, `count`,
`lastAt`. Bir xil xato takrorlansa yangi yozuv yaratilmaydi — `count` oshadi (dedup).
TTL 30 kun. Faqat bosh administrator ko'radi.

### Analysis (`analyses`)
`patient`, **`doctor`** (kim kiritgani), `name`, `value` (String), `unit`, `refRange`,
`flag` (`norma`/`yuqori`/`past`/`kritik`), `takenAt`, `doctorComment`, `attachments[]`.

### Attachment (`attachments`)
`owner`, `patient`, `name`, `mime`, `size`, `storageKey`, `context` (`message`/`analysis`),
`sha256`. Faylning o'zi diskda `UPLOAD_DIR` ichida `0600` huquq bilan saqlanadi.

### Notification (`notifications`)
`user`, `type`, **`titleKey`** (i18n kaliti), `vars`, `page`, `tone`, `read`.
Matn tarjima kaliti bilan saqlanadi — til almashsa eski xabarnomalar ham to'g'ri ko'rinadi.
TTL 90 kun.

### AuditLog (`auditlogs`)
`actor`, `actorName`, `actorRole`, `action`, `targetType`, `targetId`, `targetName`,
`meta`, `ip`, `userAgent`. TTL 2 yil (saqlash muddati siyosati).

### PasswordResetToken (`passwordresettokens`)
`user`, `tokenHash` (sha256 — xom token saqlanmaydi), `expiresAt` (TTL index), `usedAt`, `ip`.

### Conversation / Message / Appointment / AiReport
`Message.attachments[]`, `Appointment.doctorNote` va `Appointment.reminderSentAt`
(eslatma yuborilgan vaqt — ikki marta yuborilmasligi uchun) qo'shildi.

---

## 5. Autentifikatsiya

```
POST /api/auth/login {email, password}
     ├── bcrypt.compare()
     ├── 2FA yoqilmagan → to'liq JWT {sub, role, name}, 7 kun → mt_token cookie
     └── 2FA yoqilgan  → yarim JWT {sub, pending2fa:true}, 10 daqiqa
                          ↓
              POST /api/auth/2fa/verify {code}
                          ├── TOTP kodi (±30s oyna) yoki zaxira kod
                          └── to'liq JWT → mt_token cookie
```

- `getSession()` `pending2fa` bo'lgan tokenni **rad etadi** — yarim sessiya bilan hech bir
  API ishlamaydi (test bilan tasdiqlangan).
- Zaxira kodlar sha256 bilan saqlanadi va ishlatilgani darhol bekor qilinadi.
- 2FA sirini yaratish (`/2fa/setup`) QR kod (data-URL) qaytaradi; yoqilishi kod bilan
  tasdiqlanadi (`/2fa/enable`) va shunda 8 ta zaxira kod bir marta ko'rsatiladi.

**Yaroqsiz sessiya va qayta yo'naltirish halqasi.** JWT imzosi to'g'ri bo'lsa ham sessiya
o'lik bo'lishi mumkin: hisob o'chirilgan, bloklangan yoki `tokenVersion` oshgan. Server
sahifasi bunday holatda oddiy `redirect("/login")` qilsa **cheksiz halqa** chiqadi —
middleware imzoni ko'rib foydalanuvchini yana kabinetga qaytaradi
(`ERR_TOO_MANY_REDIRECTS`). Shuning uchun uchta kabinet sahifasi ham `loadPageUser()`
(`src/lib/pageUser.js`) dan foydalanadi: u foydalanuvchini yuklaydi, `isActive` va
`tokenValid()` ni tekshiradi, muvaffaqiyatsiz bo'lsa **cookie'ni tozalaydigan**
`GET /api/auth/expired` ga yo'naltiradi. U yerdan `/login?expired=1` ga o'tiladi va
foydalanuvchi "Sessiya tugadi" xabarini ko'radi.

**Barcha qurilmalardan chiqish (`POST /api/auth/logout-all`).** Foydalanuvchining
`tokenVersion` maydoni 1 ga oshiriladi. JWT ichida chiqarilgan versiya ham bo'ladi;
`route()` har so'rovda `tokenValid(session)` bilan ularni solishtiradi va mos kelmasa
`401` beradi. Bu tekshiruv bazani har so'rovda urmaydi — `src/lib/tokenVersion.js`
ichida 60 sekundlik xotira keshi bor. Amaliy ma'nosi: telefonini yo'qotgan bemor bitta
tugma bilan **hamma** eski sessiyani (boshqa brauzer, boshqa qurilma) o'chira oladi.

**Parolni tiklash:** `/api/auth/forgot` har doim `200` qaytaradi (email mavjudligini oshkor
qilmaslik uchun). Token 32 baytli tasodifiy satr, bazada faqat sha256 hash saqlanadi, 1 soat
amal qiladi. `/api/auth/reset` tokenni ishlatgach shu foydalanuvchining qolgan barcha
tokenlarini o'chiradi. SMTP sozlanmagan bo'lsa havola server logiga yoziladi.

---

## 6. API — to'liq ro'yxat

| Metod | Yo'l | Kim | Nima |
|---|---|---|---|
| GET | `/api/health` | hamma | `{status, db, ai, uptimeSec}` |
| POST | `/api/auth/register` | hamma | Ro'yxat (faqat bemor) |
| POST | `/api/auth/login` | hamma | Kirish yoki `{twoFactorRequired:true}` |
| POST | `/api/auth/logout` | hamma | Chiqish (shu qurilmada) |
| POST | `/api/auth/logout-all` | sessiya | **Barcha qurilmalardan** chiqish (`tokenVersion`++) |
| GET | `/api/auth/expired` | hamma | Yaroqsiz sessiya cookie'sini tozalab `/login` ga qaytaradi |
| GET/PATCH | `/api/auth/me` | sessiya | O'z profili |
| POST | `/api/auth/forgot` \| `/reset` | hamma | Parolni tiklash |
| POST | `/api/auth/2fa/setup` \| `/enable` \| `/disable` | sessiya | 2FA boshqaruvi |
| POST | `/api/auth/2fa/verify` | yarim sessiya | Kirishning 2-bosqichi |
| GET | `/api/doctors` | sessiya | Shifokorlar (jadvali bor-yo'qligi bilan) |
| GET | `/api/patients` | doctor | O'z bemorlari (+ analiz va kritik soni) |
| GET | `/api/patients/[id]` | doctor/admin | Bemor kartasi — **audit yoziladi** |
| PATCH | `/api/patients/[id]` | doctor/admin | Bemorning **tibbiy yozuvi** (bemor o'zi emas) |
| GET/POST | `/api/appointments` | sessiya / patient | Navbatlar; yaratishda slot tekshiriladi |
| PATCH | `/api/appointments/[id]` | ishtirokchi/admin | Holatni o'zgartirish |
| GET/PUT | `/api/schedule` | doctor | O'z ish jadvali |
| GET | `/api/schedule/[doctorId]?date=` | sessiya | Berilgan kun uchun bo'sh vaqtlar |
| GET/POST | `/api/encounters` | sessiya / **doctor** | SOAP qabul xulosalari; yozish faqat bog'liq shifokorda |
| GET | `/api/timeline?patient=` | sessiya | Yagona tibbiy tarix (navbat + analiz + xulosa) |
| GET/POST | `/api/analyses` | sessiya / **doctor** | Analizlar; kiritish faqat shifokorda |
| PATCH/DELETE | `/api/analyses/[id]` | doctor | Izoh/bayroq; o'chirish — kiritgan shifokor |
| GET/POST | `/api/conversations` | sessiya / patient | Chatlar |
| GET/POST | `/api/conversations/[id]/messages` | a'zo | Xabarlar + fayl |
| POST | `/api/uploads` | sessiya | Fayl yuklash (multipart) |
| GET | `/api/uploads/[id]` | haqli | Faylni ochish — **audit yoziladi** |
| GET/POST | `/api/notifications` | sessiya | Xabarnomalar; o'qildi belgilash |
| GET/POST | `/api/admin/users` | admin+ | Ro'yxat / yaratish |
| PATCH | `/api/admin/users/[id]` | admin+ | Tahrirlash, bloklash, rol (superadmin) |
| POST | `/api/admin/assign` | admin+ | Bemorni shifokorga biriktirish |
| GET | `/api/admin/stats` | admin+ | Klinika ko'rsatkichlari |
| GET | `/api/admin/audit` | admin+ | Audit jurnali; `?format=csv` — faqat superadmin |
| GET | `/api/admin/system` | **superadmin** | Xizmatlar, baza, xotira, xavfsizlik ko'rsatkichlari (15s kesh, `?fresh=1`) |
| POST | `/api/client-errors` | hamma | Brauzer xatosini yozish (dedup) |
| GET | `/api/client-errors` | **superadmin** | Mijoz xatolari jurnali |
| GET/POST | `/api/ai` | doctor | Gemini tahlili |
| GET | `/api/summary` | sessiya | Bosh sahifa ko'rsatkichlari (rolga qarab) |

Barcha xatolar `{ error, code, detail? }` shaklida. Klient `code` ni `err.<KOD>` kaliti
orqali o'z tiliga tarjima qiladi.

---

## 7. Ruxsat qoidalari — to'rt qatlam

**1. Marshrut (middleware).** `/bemor`, `/shifokor`, `/admin` — har biri o'z roli uchun.
Noto'g'ri rol o'z bosh sahifasiga qaytariladi.

**2. Rol (API).** `route(handler, { role: ["admin", "superadmin"] })`.

**3. Obyekt egaligi (`src/lib/access.js`).**
```js
assertDoctorLinkedToPatient(doctorId, patientId, role)
//   biriktirilgan YOKI suhbat bor → ruxsat; admin uchun har doim ruxsat
assertConversationMember(conversationId, session)
//   suhbat a'zosi bo'lmasa → 403
```

**4. Biznes qoidalari.**
- Navbat vaqti shifokor jadvalidagi **haqiqiy slotga** to'g'ri kelishi shart
  (`SLOT_UNAVAILABLE`), dam olish kuni bo'lmasligi kerak.
- Band vaqt ikki marta tekshiriladi: so'rov yaratishda va tasdiqlashda (poyga holatiga qarshi).
- Yakunlangan/rad etilgan/bekor qilingan navbat qayta ochilmaydi.
- Bemor faqat `bekor qilingan` holatini qo'ya oladi.
- Fayl faqat egasi, tegishli bemor, bog'liq shifokor yoki admin uchun ochiladi.
- Analiz faylini analizga biriktirishda fayl **o'sha shifokorniki va o'sha bemorniki**
  ekani tekshiriladi.

Socket xonasiga qo'shilishda ham xuddi shu tekshiruvlar bor (`server.js`) — API'ni chetlab
o'tib socket orqali begona chatni tinglash mumkin emas.

---

## 8. Audit jurnali

Har bir muhim amal `AuditLog` ga yoziladi (`src/lib/audit.js`, 31 ta harakat turi):
kirish/chiqish, **barcha qurilmalardan chiqish**, muvaffaqiyatsiz kirish urinishi,
**bemor kartasini ochish**, biriktirish/biriktirishni olib tashlash, foydalanuvchi
yaratish/tahrirlash/bloklash, rol o'zgarishi, litsenziya tasdiqlash, navbat qarori,
analiz kiritish/tahrirlash/o'chirish, **qabul xulosasi yozish**, AI tahlil, fayl
yuklash/ochish, jadval o'zgarishi, parolni tiklash, 2FA yoqish/o'chirish/tiklash.

- Yozuv hech qachon asosiy oqimni to'xtatmaydi (xato bo'lsa faqat log).
- Admin `role_change`, `user_deactivate`, `2fa_disable` yozuvlarini ko'rmaydi — ular faqat
  bosh administratorga ochiq; IP ham faqat bosh administratorga ko'rinadi.
- TTL index bilan 2 yildan keyin avtomatik o'chadi.

---

## 9. Xabarnomalar

Bazada `titleKey` + `vars` ko'rinishida saqlanadi, klient uni joriy tilga tarjima qiladi.
Yaratilgach darhol `user:<id>` socket xonasiga yuboriladi — sahifani yangilash shart emas.

Qachon yaratiladi: yangi bemor ro'yxatdan o'tganda (adminlarga), shifokor biriktirilganda
(bemor va shifokorga), navbat so'ralganda (shifokorga), navbat holati o'zgarganda
(qarama-qarshi tomonga), yangi analiz yoki izoh qo'shilganda (bemorga), yangi xabar
kelganda, hisob bloklanganda/faollashtirilganda.

---

## 10. Real vaqtli qatlam (Socket.io)

Ulanishda cookie'dagi JWT tekshiriladi; foydalanuvchi avtomatik ravishda ikkita xonaga
qo'shiladi: `user:<id>` (xabarnomalar) va `role:<role>`. Chat uchun `conv:<id>` xonasiga
qo'shilishda a'zolik bazadan tekshiriladi. `typing` hodisasi ham xonaga a'zolikni talab qiladi.

---

## 11. Fayllar

- Ruxsat etilgan turlar: JPEG, PNG, WEBP, HEIC, PDF, TXT. Boshqasi `415`.
- Maksimal hajm 10 MB (`MAX_UPLOAD_BYTES`), oshsa `413`.
- Fayl nomi saqlanmaydi — diskda tasodifiy `storageKey`; yo'ldan chiqib ketishga qarshi
  `path.basename()`.
- Har bir fayl uchun sha256 hisoblanadi.
- Yuklash 40/soat, javobda `Cache-Control: private, no-store` va `X-Content-Type-Options`.

---

## 12. AI qatlami (Google Gemini)

**Oqim:** shifokor forma to'ldiradi → `POST /api/ai` (+ `x-lang`) → rol va bog'liqlik
tekshiruvi → rate limit (30/soat) → bemor profili va oxirgi 15 ta analizi promptga
qo'shiladi → Gemini `generateContent` (responseSchema bilan) → natija normallashtiriladi →
`AiReport` ga saqlanadi + audit yoziladi.

**Ishonchlilik:** `GEMINI_MODEL` → `GEMINI_FALLBACK_MODELS` zanjiri (503 bo'lsa keyingisiga),
429/503 da bir marta qayta urinish, `AbortController` bilan timeout.

**Javob:** `{summary, differentials[{name, confidence 0–100, why}], investigations[],
management[], redFlags[]}` — foydalanuvchi tanlagan tilda.

**Klinik xavfsizlik:** system prompt aniq doza buyurmaslikni, yakuniy tashxis qo'ymaslikni va
xavf belgilarini ajratishni talab qiladi; UI'da har bir natija ostida ogohlantirish bor.

---

## 12a. Interfeys dizayni

- **Logotip** — `Logo.jsx`: binafsha gradient squircle, oq yurak va uning ichidan o'tuvchi
  puls chizig'i. Favicon `icon.svg` ham xuddi shunday.
- **Rangli ikonkalar** — `ColorIcon.jsx`: har bir menyu bandi o'z rangiga ega
  (dorilar — ikki rangli kapsula, xavfsizlik — yashil qalqon, navbat — ko'k kalendar qizil
  belgi bilan, suhbat — binafsha/pushti pufaklar, AI — chip, jadval — moviy soat…).
  Ikonkalar SVG ichida rang belgilaydi, shuning uchun CSS `color` ularga ta'sir qilmaydi.
- **Animatsiyalar** — sahifa va kartalar bosqichma-bosqich chiqadi (`riseIn`), menyu bandlari
  chapdan suriladi, ikonkalar hover'da kattalashadi, jadval qatorlari va slotlar ketma-ket
  paydo bo'ladi, tugmalar bosilganda "bosilish" effekti beradi, o'qilmagan nishonlar
  yumshoq pulsatsiya qiladi. `prefers-reduced-motion` yoqilgan bo'lsa hammasi o'chadi.
- **Skeleton yuklash** — raqamli ko'rsatkichlar (`<Num>`) va jadvallar ma'lumot kelmaguncha
  jimirlaydigan kulrang blok sifatida chiqadi; "0" ko'rsatib keyin haqiqiy raqamga
  o'tib ketish yo'q.
- **Chop etish uslublari** — `@media print`: sidebar, topbar, tugmalar va modal fon
  yashiriladi, bemor kartasi oq qog'ozda toza ko'rinadi (shifokor "Chop etish" tugmasi).
- **Qulaylik (a11y)** — "Asosiy mazmunga o'tish" havolasi, modal ichida fokus qulfi va
  `Esc`, `aria-live` bilan e'lon qilinadigan toast'lar, barcha ikonka-tugmalarda
  `aria-label`, formada `label`↔`input` avtomatik bog'lanishi, klaviatura bilan to'liq
  navigatsiya.
- **Responsivlik** — 320px dan boshlab tekshirilgan (320 / 360 / 390 / 768 / 1024 / 1280).
  Barcha grid elementlariga `min-width:0` beriladi — aks holda uzun matn gridni cho'zib
  yuboradi va sahifa yonga siljiydi.
- **Telefonda jadval → karta** — barcha ma'lumot jadvallari `table.cards` klassi bilan
  yoziladi. Tor ekranda `thead` yashiriladi, har bir qator kartaga aylanadi va ustun nomi
  `td[data-label]` dan `::before` orqali chiqadi. Shu tufayli telefonda jadvalni yon
  tomonga surish kerak bo'lmaydi.
- **Xatoga chidamlilik** — `ErrorBoundary` butun kabinetni o'raydi: komponent yiqilsa
  foydalanuvchi oq ekran emas, tushunarli xabar va "Qayta yuklash" tugmasini ko'radi,
  xato esa fon rejimida `/api/client-errors` ga yuboriladi.

## 12b. Klinik oqim: qabul xulosasi, tibbiy tarix va eslatmalar

**SOAP qabul xulosasi.** Shifokor bemor kartasini ochadi → "Qabul xulosasini yozish" →
S/O/A/P maydonlari va ko'rsatkichlar (qon bosimi, puls, harorat, vazn) → saqlash.
Agar xulosa navbatga bog'langan bo'lsa, o'sha navbat avtomatik `yakunlangan` bo'ladi —
shifokor ikkita ishni bitta harakatda bajaradi. Bemorga xabarnoma boradi.

**Yagona tibbiy tarix (`GET /api/timeline`).** Uch xil yozuv bitta xronologik oqimga
qo'shiladi:

```
navbat (Appointment)  ─┐
analiz  (Analysis)    ─┼──► sana bo'yicha teskari tartibda ──► Timeline.jsx
xulosa  (Encounter)   ─┘
```

Har bir element o'z rangi va ikonkasi bilan chiqadi. Bemor o'z tarixini ko'radi;
shifokor bemor kartasi ichida `?patient=<id>` bilan o'sha bemorning tarixini ko'radi
(bog'liqlik `assertDoctorLinkedToPatient` bilan tekshiriladi — begona shifokor `403` oladi).

**Navbat eslatmasi.** `server.js` ichida `REMINDER_INTERVAL_MS` (standart 10 daqiqa)
davriyligida ishlaydigan reja: tasdiqlangan va **24 soat ichida** bo'ladigan navbatlarni
topadi, bemorga xabarnoma yuboradi va `reminderSentAt` ni belgilaydi — shu tufayli
eslatma ikki marta bormaydi. Server o'chsa reja ham to'xtaydi (graceful shutdown).

## 13. Ko'p tillilik

- `dictionary.js` + `dictionary.extra.js` + `dictionary.extra2.js` + `dictionary.extra3.js`
  — **704 ta kalit × 3 til** (build vaqtida birlashtiriladi).
- `npm run check:i18n` uchta tilni asos (uz) bilan solishtiradi; bitta kalit yetishmasa
  **CI yiqiladi**, ya'ni yarim tarjima holatda kod birlashtirilmaydi.
- `useI18n()` → `t()`, `fd/ft/fdt` (sana), `status()`, `monthName()`, `apiError()`.
- Sanalar `Intl` emas, qo'lda `dd.mm.yyyy` — `uz-Cyrl` locale ma'lumotlari hamma muhitda
  to'liq emas.
- Bazadagi holatlar (`kutilmoqda`, `tasdiqlangan`…) va analiz bayroqlari (`norma`, `kritik`…)
  o'zbek lotinda saqlanadi, faqat ko'rsatishda tarjima qilinadi.
- Allergiya chiplari `[value, label]`: `value` bazaga, `label` ekranga.
- Server xato matnlari ham qaytadi, lekin klient `code` ni afzal ko'radi.

---

## 14. Xavfsizlik xulosasi

| Chora | Qayerda |
|---|---|
| bcrypt (10 rounds), parol murakkabligi (harf + raqam, ≥8) | `auth.js`, `schemas.js` |
| JWT httpOnly + SameSite=Lax + Secure(prod) | `cookies.js` |
| 2FA (TOTP + zaxira kodlar), yarim sessiya izolyatsiyasi | `totp.js`, `session.js` |
| "Barcha qurilmalardan chiqish" — `tokenVersion` (60s kesh) | `tokenVersion.js` |
| Klinik matn maydonlari AES-256-GCM bilan shifrlangan | `crypto.js` |
| Yaroqsiz sessiya cookie'si tozalanadi (halqa yo'q) | `pageUser.js`, `api/auth/expired` |
| `JWT_SECRET` ≥32 belgi tekshiruvi — aks holda server ishga tushmaydi | `server.js` |
| Rol + obyekt egaligi + biznes qoidalari | `middleware.js`, `http.js`, `access.js` |
| Barcha kirishlar zod bilan; ObjectId formati tekshiriladi | `schemas.js` |
| Rate limiting (login, register, forgot, 2FA, navbat, xabar, fayl, AI) | `ratelimit.js` |
| Audit jurnali + IP faqat bosh administratorga | `audit.js` |
| Fayl turi/hajmi/yo'li nazorati | `uploads.js` |
| Xavfsizlik sarlavhalari, HSTS (prod), `X-Powered-By` o'chirilgan | `next.config.mjs` |
| API javoblari `no-store` | `next.config.mjs` |
| Parol tiklash tokeni faqat hash ko'rinishida, bir martalik | `PasswordResetToken.js` |
| Mijoz xatolari 500/4000 belgiga cheklangan, dedup bilan (spam'ga qarshi) | `ClientError.js` |
| Zaxira va tiklash skriptlari | `scripts/backup.mjs`, `restore.mjs` |
| CI da `npm audit --audit-level=high` — zaiflik topilsa build yiqiladi | `.github/workflows/ci.yml` |
| npm zaifliklari: 0 (postcss `overrides` bilan yopilgan) | `package.json` |

---

## 15. Muhit o'zgaruvchilari

```bash
MONGODB_URI=mongodb+srv://user:parol@cluster.mongodb.net/medtherapist   # majburiy
JWT_SECRET=kamida-32-belgili-tasodifiy-satr                            # majburiy
NEXT_PUBLIC_APP_URL=http://localhost:3000                              # tiklash havolasi uchun

GEMINI_API_KEY=...                                    # bo'lmasa AI o'chadi, qolgani ishlaydi
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-3.6-flash
GEMINI_TIMEOUT_MS=45000

SMTP_HOST= SMTP_PORT=587 SMTP_USER= SMTP_PASS= SMTP_FROM=              # ixtiyoriy
REDIS_URL=                                                             # ixtiyoriy
UPLOAD_DIR=./uploads
MAX_UPLOAD_BYTES=10485760
PORT=3000  HOST=0.0.0.0  LOG_LEVEL=info  MONGO_POOL_SIZE=10

ENCRYPTION_KEY=                  # 32 bayt hex — `npm run keygen` bilan yarating.
                                 # Bo'lmasa shifrlash o'chadi (baza ishlaydi, lekin ochiq matnda)
COOKIE_SECURE=                   # `false` — HTTPS'siz muhitda (masalan lokal `npm start`) kirish uchun
REMINDER_INTERVAL_MS=600000      # navbat eslatmasi rejasining davriyligi (standart 10 daqiqa)
```

**Eslatma:** `ENCRYPTION_KEY` ni almashtirib bo'lmaydi — u bilan shifrlangan yozuvlar
faqat shu kalit orqali ochiladi. Kalitni `.env` dan tashqarida (parol menejerida yoki
maxfiy ombor xizmatida) ham saqlab qo'ying.

---

## 16. Ishga tushirish va test

```bash
npm install
cp .env.example .env
npm run seed              # demo: 1 bosh admin, 1 admin, 3 shifokor, 5 bemor, jadvallar
npm run dev               # http://localhost:3000
npm run build && npm start
npm run test:smoke        # 145 ta tekshiruv (server ishlab turishi kerak)
npm run test:smoke:ai     # + haqiqiy Gemini so'rovi
npm run check:i18n        # uch tilda kalit to'liqligi
npm test                  # check:i18n + build
npm run backup            # bazani JSON arxivga saqlash (backups/)
npm run restore <fayl>    # arxivdan tiklash
npm run keygen            # ENCRYPTION_KEY uchun tasodifiy kalit
```

**CI (`.github/workflows/ci.yml`).** Har bir push va pull request'da: `mongo:7` xizmat
konteyneri ko'tariladi → `npm ci` → `npm audit --audit-level=high` → `check:i18n` →
`next build` → server ishga tushiriladi → `seed` → **145 ta smoke test**. Bosqichlardan
biri yiqilsa CI qizil bo'ladi.

**Demo hisoblar** (parol `Parol12345`): `bosh@test.uz` (bosh admin), `admin@test.uz`,
`shifokor@test.uz` / `shifokor2@test.uz` / `shifokor3@test.uz`,
`bemor@test.uz` / `nilufar@test.uz` / `dilnoza@test.uz`,
`bekzod@test.uz` / `madina@test.uz` (biriktirilmagan — admin panelida biriktirasiz).

**Smoke test nimalarni tekshiradi** (tibbiy yozuv qulfi, admin/superadmin farqi, tizim sahifasi va CSV eksport ham qamrab olingan): salomatlik, 4 rol bilan kirish, ochiq ro'yxat faqat
bemor ekani, admin huquqlari (admin admin yarata olmaydi, o'zini bloklay olmaydi, rol
o'zgartira olmaydi), biriktirish va bekor qilish, bemor o'zini biriktira olmasligi, ish
jadvali (teskari vaqt rad etiladi), bo'sh slotlar, jadvaldan tashqari vaqtga navbat
(`SLOT_UNAVAILABLE`), takroriy so'rov, band slotning yopilishi, analizni faqat shifokor
kiritishi, begona shifokorning kira olmasligi, fayl yuklash/tur nazorati/ruxsat, chatga fayl,
xabarnomalar, audit jurnali va admin uchun yashirilgan amallar, 2FA (QR, noto'g'ri kod,
yoqish, kirishda kod, yarim sessiya bloklanishi, zaxira kod va uning bir martaligi,
o'chirish), parolni tiklash, xavfsizlik sarlavhalari, AI.

**Bu bosqichda qo'shilgan testlar:** SOAP xulosasi yaratish (bo'sh xulosa `400`,
retsept va tashxis saqlanishi), bemorning xulosa yoza olmasligi va begona shifokorning
kira olmasligi (`403`),
tibbiy tarix (timeline) uch xil yozuvni birlashtirishi, shifrlashning ochiq/yopiq
yo'llari, "barcha qurilmalardan chiqish" eski tokenni kuchsizlantirishi, mijoz xatosi
yozilishi va dedup, `/api/admin/system` ga faqat bosh administrator kirishi,
audit CSV eksporti.

**Tozalash:** test o'z ishini tugatgach yaratgan vaqtinchalik hisoblarini
(`doc…`/`a…`/`t…`/`p…@test.uz`) va ularga bog'liq yozuvlarni bazadan o'chiradi —
demo ma'lumotlar orasida axlat to'planmaydi.

---

## 17. Ma'lumot oqimi — to'liq misol

**Bemor ro'yxatdan o'tadi → admin biriktiradi → navbat oladi → shifokor analiz kiritadi**

```
1. Bemor /register orqali ro'yxatdan o'tadi (role: patient)
      └─ barcha adminlarga "notif.newPatientRegistered" xabarnomasi (socket orqali darhol)
2. Admin /admin → "Biriktirish" → bemorni tanlaydi → shifokorni tanlaydi
      ├─ POST /api/admin/assign
      ├─ User.assignedDoctor = doctor, assignedBy = admin
      ├─ Conversation upsert (chat ochiladi)
      ├─ AuditLog: patient_assign
      └─ bemorga va shifokorga xabarnoma
3. Shifokor "Ish jadvalim" → dushanba–juma 09:00–17:00, slot 30 daqiqa → PUT /api/schedule
4. Bemor "Navbat olish" → sana tanlaydi
      └─ GET /api/schedule/<doctorId>?date=... → bo'sh slotlar (band vaqtlar o'chirilgan)
5. Bemor slotni bosadi, sabab yozadi → POST /api/appointments
      ├─ slot jadvalga mos keladimi? band emasmi? takror emasmi?
      ├─ Appointment {status: "kutilmoqda"}
      └─ shifokorga xabarnoma
6. Shifokor "Navbatlar" → Tasdiqlash
      ├─ band vaqt qayta tekshiriladi
      ├─ AuditLog: appointment_decide
      └─ bemorga xabarnoma; slot boshqalar uchun yopiladi
7. Qabuldan keyin shifokor bemor kartasini ochadi (AuditLog: patient_card_view)
      └─ "Bemorga analiz kiritish" → nom, qiymat, me'yor, bayroq, fayl → POST /api/analyses
          ├─ AuditLog: analysis_create
          └─ bemorga "notif.newAnalysis" xabarnomasi
8. Bemor "Analizlarim" bo'limida natijani va shifokor izohini ko'radi (o'zi kirita olmaydi)
9. Shifokor xuddi shu kartada "Qabul xulosasini yozish" → S/O/A/P + ko'rsatkichlar
      ├─ POST /api/encounters (appointmentId bilan)
      ├─ navbat avtomatik "yakunlangan" bo'ladi
      ├─ AuditLog: encounter_create
      └─ bemorga xabarnoma
10. Bemor "Tibbiy tarix" bo'limida navbat → analiz → xulosani bitta xronologik
    lentada ko'radi (GET /api/timeline)
11. Navbatdan 24 soat oldin server rejasi bemorga eslatma yuboradi (reminderSentAt)
```

---

## 18. Ma'lum cheklovlar va keyingi qadamlar

**Cheklovlar:**
- Fayllar mahalliy diskda — bir nechta serverda umumiy ombor (S3/MinIO) kerak bo'ladi.
- Socket.io adapteri yo'q — bir nechta instansda Redis adapter kerak (rate limit allaqachon
  Redis'ni qo'llab-quvvatlaydi).
- Navbat eslatmasi rejasi **har bir instansda** ishlaydi; bir nechta serverda ishlatilganda
  taqsimlangan qulf (yoki tashqi cron) kerak bo'ladi.
- Chat tarixi oxirgi 200 ta xabar bilan cheklangan, sahifalash yo'q.
- Shifokor jadvali haftalik takrorlanadi; alohida kunlar uchun maxsus vaqt kiritish yo'q
  (faqat dam olish kunini belgilash mumkin).
- SMTP sozlanmaganda parolni tiklash havolasi faqat server logida ko'rinadi.
- Shifrlangan maydonlar bo'yicha bazada **qidiruv ishlamaydi** (shifrlash narxi shu);
  hozircha bunday qidiruv talab qilinmaydi.
- `ENCRYPTION_KEY` ni almashtirish (key rotation) uchun migratsiya skripti yo'q.
- Eslatma va xabarnomalar faqat ilova ichida va email orqali — SMS/push yo'q.
- Chop etish brauzer orqali (`@media print`); server tomonda PDF generatsiyasi yo'q.

**Keyingi qadamlar:**
1. S3/MinIO'ga fayl saqlash va antivirus tekshiruvi.
2. Socket.io Redis adapteri va eslatma rejasi uchun taqsimlangan qulf.
3. Yo'llanma (referral) moduli va retseptni alohida hujjat sifatida chiqarish.
4. SMS/push xabarnomalar.
5. Server tomonda PDF eksport (hozir brauzer chop etishi bor).
6. Bo'limlar (department) bo'yicha admin huquqlarini cheklash.
7. `ENCRYPTION_KEY` rotatsiyasi uchun migratsiya skripti.
