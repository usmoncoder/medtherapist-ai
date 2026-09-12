# MedTherapist AI

Ko'p shifokorli klinika uchun raqamli platforma: **to'rt rol** (bemor, shifokor,
administrator, bosh administrator), bemorni shifokorga biriktirish, shifokor ish jadvali
va slot bo'yicha online navbat, analizlar, **SOAP qabul xulosasi**, **yagona tibbiy
tarix (timeline)**, fayl almashish, real vaqtli yopiq chat, audit jurnali, ikki
bosqichli tasdiqlash, **maydon darajasidagi shifrlash** va Gemini asosidagi klinik AI
yordamchi. Interfeys **uch tilda**: o'zbekcha (lotin), o'zbekcha (kirill), ruscha.

> Tizimning to'liq texnik tavsifi — [tizim_arxitekturasi.md](tizim_arxitekturasi.md)

## Ishga tushirish

```bash
npm install
cp .env.example .env      # MONGODB_URI, JWT_SECRET va (ixtiyoriy) GEMINI_API_KEY
npm run keygen            # ENCRYPTION_KEY uchun 32-baytli kalit
npm run seed              # demo hisoblar va ma'lumotlar
npm run dev               # http://localhost:3000
```

Demo hisoblar (parol `Parol12345`):

| Rol | Email |
|---|---|
| Bosh administrator | `bosh@test.uz` |
| Administrator | `admin@test.uz` |
| Shifokor | `shifokor@test.uz`, `shifokor2@test.uz`, `shifokor3@test.uz` |
| Bemor | `bemor@test.uz`, `nilufar@test.uz`, `dilnoza@test.uz` |
| Biriktirilmagan bemor | `bekzod@test.uz`, `madina@test.uz` |

## Buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri (Next.js + Socket.io bitta portda) |
| `npm run build` / `npm start` | Ishlab chiqarish uchun yig'ish va ishga tushirish |
| `npm run seed` | Bazani demo ma'lumotlar bilan to'ldirish |
| `npm run test:smoke` | 147 ta uchidan-uchiga avtotest (server ishlab turishi kerak) |
| `npm run test:smoke:ai` | Yuqoridagilar + haqiqiy Gemini so'rovi |
| `npm run check:i18n` | Uch tilda tarjima kalitlari to'liqligini tekshiradi |
| `npm test` | `check:i18n` + `build` (CI ning qisqa varianti) |
| `npm run backup` | Bazani JSON arxivga saqlash (`backups/`) |
| `npm run restore <fayl>` | Arxivdan tiklash |
| `npm run keygen` | `ENCRYPTION_KEY` uchun tasodifiy kalit chiqaradi |

Salomatlik tekshiruvi: `GET /api/health` → `{status, db, ai, uptimeSec}`

Talab: **Node.js 22.9+**. Skriptlar `.env` faylni bo'lsa o'qiydi (`--env-file-if-exists`),
bo'lmasa o'zgaruvchilarni muhitdan oladi — shuning uchun serverda `.env` shart emas.

## Railway'ga joylash

Loyiha **bitta servis** sifatida joylanadi: `server.js` sahifalar (frontend), `/api`
(backend) va `/socket.io` (chat) ni bitta portda ishlatadi. Frontendni alohida joylash
kerak emas. Baza MongoDB Atlas'da qoladi.

> Vercel mos emas: u doimiy serverni qo'llamaydi — real vaqtli chat, fayl yuklash
> (diskka yoziladi) va navbat eslatmalari (`setInterval`) u yerda ishlamaydi.

1. [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** →
   `usmoncoder/medtherapist-ai`. Build (`npm run build`) va start (`npm start`)
   buyruqlarini Railway `package.json` dan o'zi aniqlaydi.
2. **Variables** bo'limiga kiriting:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `MONGODB_URI` | Atlas ulanish satri |
   | `JWT_SECRET` | ≥32 belgili tasodifiy satr |
   | `ENCRYPTION_KEY` | **lokal `.env` dagi bilan aynan bir xil** — aks holda shifrlangan bemor ma'lumotlari ochilmaydi |
   | `GEMINI_API_KEY` | ixtiyoriy (AI uchun) |
   | `NEXT_PUBLIC_APP_URL` | Railway bergan domen, masalan `https://….up.railway.app` |
   | `UPLOAD_DIR` | `/data/uploads` (3-qadamdagi volume) |

   `PORT` va `COOKIE_SECURE` ni **qo'ymang** — port Railway'dan keladi, production'da
   cookie avtomatik `Secure`.
3. **Volume** qo'shing, mount path: `/data/uploads` — aks holda har qayta joylashda
   yuklangan fayllar o'chadi.
4. **Settings → Networking → Generate Domain**; **Healthcheck path**: `/api/health`.
5. **MongoDB Atlas → Network Access**: Railway IP'lari o'zgaruvchan, shuning uchun
   `0.0.0.0/0` qo'shiladi — baza foydalanuvchisi paroli kuchli bo'lishi shart.

**Xavfsizlik:** `npm run seed` demo hisoblarni `Parol12345` paroli bilan yaratadi —
haqiqiy klinikada ishlatishdan oldin bu hisoblarning parollarini almashtiring yoki ularni
bloklang.
Uzluksiz integratsiya: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) —
mongo:7 xizmati, `npm audit`, i18n tekshiruvi, build, seed va 147 ta smoke test.

## Rollar

**Bemor** — birinchi kirganda **3 qadamli onboarding**; faqat **shaxsiy** ma'lumotini
tahrirlaydi (ism, tug'ilgan sana, jins, telefon, manzil, qon guruhi); biriktirilgan
shifokorning **bo'sh vaqtlaridan** navbat oladi; analizlari, qabul xulosalari va
**tibbiy yozuvini faqat ko'radi**; **yagona tibbiy tarix** (navbat + analiz + xulosa)
ni ko'radi; shifokori bilan chat va fayl almashadi; 2FA va "barcha qurilmalardan chiqish".

**Shifokor** — haftalik ish jadvali va dam olish kunlari; bemorlar ro'yxati va kartasi;
navbatlarni tasdiqlash/rad etish/yakunlash; **analiz kiritish** (bayroq: me'yorda / yuqori /
past / kritik), **SOAP qabul xulosasi yozish** (shikoyat / ko'rik / tashxis / reja +
ko'rsatkichlar) va **bemorning tibbiy yozuvini tahrirlash**; fayl biriktirish;
bemor kartasini **chop etish**; Gemini AI tahlili.

**Administrator** — bemorlarni shifokorlarga biriktirish; **faqat bemor va shifokor**
hisoblarini ko'rish/yaratish/bloklash; barcha navbatlar; audit jurnali (IP'siz).

**Bosh administrator** — hammasi + administratorlarni ko'rish va yaratish, **rollarni
o'zgartirish**, **shifokor litsenziyasini tasdiqlash**, **birovning 2FA sini tiklash**,
**Tizim holati** sahifasi (baza, AI, shifrlash, disk, xotira), **mijoz xatolari
jurnali**, to'liq audit jurnali (IP bilan) va **CSV eksport**.

| Imkoniyat | admin | superadmin |
|---|:--:|:--:|
| Biriktirish, bemor/shifokor hisoblari | ✅ | ✅ |
| Administratorlarni ko'rish va yaratish | ❌ | ✅ |
| Rolni o'zgartirish | ❌ | ✅ |
| Shifokor litsenziyasini tasdiqlash | ❌ | ✅ |
| Birovning 2FA sini tiklash | ❌ | ✅ |
| "Hodimlar" va "Tizim holati" bo'limlari | ❌ | ✅ |
| Mijoz (brauzer) xatolari jurnali | ❌ | ✅ |
| Audit: maxfiy amallar, IP, CSV eksport | ❌ | ✅ |

### Tibbiy yozuv qulfi

Bemorning shikoyati, anamnezi, allergiyasi va surunkali kasalliklarini **faqat shifokor**
yozadi. Bemor ularni profilida ko'radi, lekin o'zgartira olmaydi — server tomonda bu
maydonlar bemor so'rovidan chiqarib tashlanadi, har bir o'zgarish esa audit'ga tushadi.
Shikoyat va anamnez bazada **AES-256-GCM bilan shifrlangan** holda saqlanadi.

## Arxitektura — qisqacha

| Qatlam | Nima |
|---|---|
| Server | `server.js` — Next.js va Socket.io **bitta portda**, navbat eslatmasi rejasi, graceful shutdown |
| Auth | JWT (jose) → httpOnly cookie, 7 kun; TOTP 2FA + zaxira kodlar; parolni tiklash; `tokenVersion` orqali "hammadan chiqish" |
| Himoya | `middleware.js` (marshrut) → `route(handler,{role})` (rol) → `access.js` (obyekt egaligi) → biznes qoidalari |
| Validatsiya | Har bir endpointda `zod`; xatolar kod bilan (`{error, code}`) |
| Shifrlash | `lib/crypto.js` — AES-256-GCM, `enc:v1:` prefiksi, eski matn bilan mos |
| Model | 13 ta: `User`, `Schedule`, `Appointment`, `Analysis`, `Encounter`, `Attachment`, `Conversation`, `Message`, `Notification`, `AuditLog`, `PasswordResetToken`, `AiReport`, `ClientError` |
| API | 37 ta endpoint (`src/app/api/`) |
| Realtime | Socket.io: `conv:<id>` (chat), `user:<id>` (xabarnomalar), `role:<rol>` |
| Audit | 31 ta harakat turi, TTL 2 yil; bemor kartasini ochish ham yoziladi |
| Xatolar | `ErrorBoundary` → `POST /api/client-errors` → bosh admin paneli |
| AI | `lib/gemini.js` — JSON schema, model zaxira zanjiri, timeout |
| i18n | `lib/i18n/` — **704 ta kalit × 3 til**, CI da to'liqlik tekshiriladi |
| Dizayn | Rangli gradient logotip, 23 ta rangli bo'lim ikonkasi, skeleton yuklash, telefonda jadvallar kartaga aylanadi, chop etish uslublari, `prefers-reduced-motion` va klaviatura navigatsiyasi hurmat qilinadi |

**Frontend:** `src/components/` (`patient/`, `doctor/`, `admin/` bo'limlari),
`src/app/*/page.jsx`, `globals.css`, `src/lib/{i18n,api.js,reference.js,useNotifications.js}`
**Backend:** `server.js`, `src/app/api/`, `src/models/`, `src/middleware.js`,
`src/lib/` (qolgani), `scripts/`

## Xavfsizlik

- Parol bcrypt (10 rounds), murakkablik talabi (harf + raqam, ≥8)
- JWT httpOnly + SameSite=Lax + Secure(prod); 2FA yarim sessiyasi API'ga kirmaydi
- **"Barcha qurilmalardan chiqish"** — `tokenVersion` oshiriladi, eski tokenlar o'ladi
- Yaroqsiz sessiya cookie'si tozalanadi (`/api/auth/expired`) — qayta yo'naltirish halqasi yo'q
- **Maydon darajasidagi shifrlash** (AES-256-GCM): bemor shikoyati va anamnezi
- Rol + obyekt egaligi tekshiruvi: ID ni taxmin qilib begona ma'lumotga kirib bo'lmaydi
- Rate limiting: login 10/10daq **hisob bo'yicha** + 60/10daq IP bo'yicha (bitta NAT ortidagi
  klinika xodimlari bir-birini bloklamaydi), register 5/10daq, forgot 5/15daq, 2FA 10/10daq,
  navbat 20/soat, xabar 60/daq, fayl 40/soat, AI 30/soat
- Fayllar: faqat JPG/PNG/WEBP/HEIC/PDF/TXT, ≤10 MB, tasodifiy nom, ruxsat tekshiruvi
- Xavfsizlik sarlavhalari + HSTS (prod), API javoblari `no-store`
- Zaxira va tiklash skriptlari (`npm run backup` / `npm run restore`)
- `npm audit`: 0 zaiflik

## AI Assistant (Gemini)

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-3.6-flash
```

So'rovga bemor profili, surunkali kasalliklari va oxirgi 15 ta analizi avtomatik qo'shiladi.
Javob JSON schema bilan tuzilgan holda va foydalanuvchi tilida qaytadi. Model band bo'lsa
zaxira modelga o'tadi. Kalit bo'lmasa AI bo'limi "sozlanmagan" deb ko'rsatadi.

## Keyingi qadamlar

1. Fayllarni S3/MinIO'da saqlash va antivirus tekshiruvi
2. Socket.io Redis adapteri (gorizontal masshtab)
3. Retsept va yo'llanma modullari
4. SMS/push xabarnomalar (hozir faqat ilova ichida va email)
5. Bemor kartasini PDF sifatida eksport qilish (hozir brauzer chop etishi bor)
