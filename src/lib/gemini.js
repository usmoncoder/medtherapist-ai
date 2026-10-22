// Google Gemini API — klinik yordamchi.
// Kalit faqat serverda ishlatiladi, brauzerga hech qachon chiqmaydi.
import { ApiError } from "./errors";
import { logger } from "./logger";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45_000);

// Asosiy model .env dan, qolganlari zaxira: model band bo'lsa (503) keyingisiga o'tadi
const modelChain = () => {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-3.6-flash")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    patientSummary: { type: "string" },
    riskLevel: { type: "string", enum: ["green", "yellow", "red"] },
    riskReason: { type: "string" },
    differentials: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          confidence: { type: "integer" },
          why: { type: "string" },
        },
        required: ["name", "confidence", "why"],
      },
    },
    investigations: { type: "array", items: { type: "string" } },
    management: { type: "array", items: { type: "string" } },
    redFlags: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "patientSummary", "riskLevel", "riskReason", "differentials", "investigations", "management", "redFlags"],
};

const LANG_RULE = {
  uz: "Javobni faqat o'zbek tilida, lotin alifbosida yoz.",
  uzc: "Жавобни фақат ўзбек тилида, кирилл алифбосида ёз.",
  ru: "Пиши ответ только на русском языке.",
};

const systemPrompt = (lang) => `Sen tajribali terapevt shifokorga yordam beradigan klinik yordamchisan.
${LANG_RULE[lang] || LANG_RULE.uz}

Berilgan bemor ma'lumotlari asosida quyidagilarni qaytar:
- summary: 2-3 gapda klinik xulosa (shifokor uchun, tibbiy atamalar bilan)
- patientSummary: xuddi shu xulosani BEMOR uchun oddiy, kundalik tilda, tibbiy atamalarsiz tushuntir. Masalan "gastroezofageal reflyuks" o'rniga "oshqozon kislotasi qizilo'ngachga qaytib chiqishi". 2-4 gap, tinchlantiruvchi va aniq.
- riskLevel: bemor holatining shoshilinchlik darajasi — faqat "green" (normal, xavf yo'q), "yellow" (e'tibor va kuzatuv kerak) yoki "red" (shoshilinch baholash kerak)
- riskReason: riskLevel nega shunday qo'yilgani — bir qisqa gap
- differentials: 3-5 ta ehtimoliy tashxis; confidence 0-100 oralig'ida butun son; why - qisqa klinik asos
- investigations: tavsiya etilgan tekshiruvlar ro'yxati
- management: boshqaruv va davolash yo'nalishlari ro'yxati
- redFlags: shoshilinch e'tibor talab qiladigan xavf belgilari

Qoidalar:
1. Aniq dori dozasini buyruq sifatida yozma - faqat yo'nalish ber.
2. Ma'lumot yetishmasa, qanday qo'shimcha ma'lumot kerakligini investigations ichida ayt.
3. Hech qachon yakuniy tashxis qo'yma - bu shifokorning vazifasi.
4. Xavfli holat belgilari bo'lsa, ularni redFlags ga albatta kirit va riskLevel ni "red" qil.
5. redFlags bo'sh bo'lsa-yu lekin kuzatuv kerak bo'lsa riskLevel "yellow", hammasi barqaror bo'lsa "green".`;

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel() {
  return modelChain()[0];
}

function buildPrompt(input) {
  return [
    `Bemor: ${input.patientName || "—"}, ${input.age ?? "—"} yosh, ${input.gender || "—"}`,
    `Shikoyatlar: ${input.complaint || "—"}`,
    `Simptomlar: ${(input.symptoms || []).join(", ") || "—"}`,
    `Qon bosimi: ${input.bp || "—"}, Puls: ${input.pulse || "—"}, Tana harorati: ${
      input.temp ? `${input.temp} °C` : "—"
    }, SpO₂ (kislorod to'yinganligi): ${input.spo2 ? `${input.spo2}%` : "—"}`,
    `Allergiya: ${input.allergies || "—"}`,
    `Surunkali kasalliklar: ${input.chronic || "—"}`,
    `Tibbiy tarix: ${input.history || "—"}`,
    `So'nggi analizlar: ${input.analyses || "—"}`,
    `Qo'shimcha: ${input.extra || "—"}`,
  ].join("\n");
}

async function callModel(model, prompt, lang, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(lang) }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
        safetySettings: [],
      }),
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeCase(input, lang = "uz") {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ApiError("AI_NOT_CONFIGURED");

  const prompt = buildPrompt(input);
  const chain = modelChain();
  let lastDetail = "";

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let status, text;
      try {
        ({ status, text } = await callModel(model, prompt, lang, key));
      } catch (e) {
        lastDetail = e.name === "AbortError" ? "Gemini javob bermadi (timeout)" : String(e.message);
        logger.warn("gemini so'rovi uzildi", { model, detail: lastDetail });
        break; // keyingi modelga
      }

      if (status === 200) {
        const data = JSON.parse(text);
        const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
        if (!out) {
          lastDetail = "Gemini bo'sh javob qaytardi";
          break;
        }
        let parsed;
        try {
          parsed = JSON.parse(out);
        } catch {
          lastDetail = "Gemini javobini o'qib bo'lmadi";
          break;
        }
        logger.info("gemini tahlili tayyor", { model });
        return normalize(parsed, model);
      }

      // 429/503 — vaqtinchalik; bir marta kutib qayta urinamiz, keyin zaxira modelga
      if (status === 429 || status === 503) {
        lastDetail = `model band (${status})`;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 900));
          continue;
        }
        break;
      }

      lastDetail = `Gemini xatosi (${status}): ${text.slice(0, 200)}`;
      logger.warn("gemini xatosi", { model, status });
      break;
    }
  }

  if (/band \(50[23]\)|band \(429\)/.test(lastDetail)) throw new ApiError("AI_BUSY", lastDetail);
  throw new ApiError("AI_FAILED", lastDetail);
}

function normalize(parsed, model) {
  const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 12) : []);
  const risk = ["green", "yellow", "red"].includes(parsed.riskLevel) ? parsed.riskLevel : "green";
  return {
    summary: String(parsed.summary || ""),
    patientSummary: String(parsed.patientSummary || ""),
    riskLevel: risk,
    riskReason: String(parsed.riskReason || ""),
    differentials: (parsed.differentials || []).slice(0, 6).map((d) => ({
      name: String(d.name || ""),
      confidence: Math.max(0, Math.min(100, Math.round(Number(d.confidence) || 0))),
      why: String(d.why || ""),
    })),
    investigations: arr(parsed.investigations),
    management: arr(parsed.management),
    redFlags: arr(parsed.redFlags),
    model,
  };
}
