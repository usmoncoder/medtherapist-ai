import nodemailer from "nodemailer";
import { logger } from "./logger";

let transport = null;
let checked = false;

function getTransport() {
  if (checked) return transport;
  checked = true;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    logger.info("SMTP sozlanmagan — xatlar logga yoziladi");
    return null;
  }
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transport;
}

export const mailerConfigured = () => Boolean(process.env.SMTP_HOST);

/**
 * Xat yuboradi. SMTP sozlanmagan bo'lsa xatni logga yozadi va `delivered: false` qaytaradi —
 * ishlab chiqishda havolani terminaldan olish mumkin.
 */
export async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) {
    logger.info("XAT (yuborilmadi, SMTP yo'q)", { to, subject, text });
    return { delivered: false };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "Med AI <no-reply@medtherapist.uz>",
      to,
      subject,
      text,
      html,
    });
    return { delivered: true };
  } catch (e) {
    logger.error("xat yuborilmadi", { to, message: e.message });
    return { delivered: false, error: e.message };
  }
}

const T = {
  uz: {
    subject: "Parolni tiklash — Med AI",
    body: (link) =>
      `Assalomu alaykum!\n\nParolni tiklash uchun quyidagi havolaga o'ting:\n${link}\n\nHavola 1 soat amal qiladi. Agar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
  },
  uzc: {
    subject: "Паролни тиклаш — Med AI",
    body: (link) =>
      `Ассалому алайкум!\n\nПаролни тиклаш учун қуйидаги ҳаволага ўтинг:\n${link}\n\nҲавола 1 соат амал қилади. Агар сиз сўрамаган бўлсангиз, бу хатни эътиборсиз қолдиринг.`,
  },
  ru: {
    subject: "Восстановление пароля — Med AI",
    body: (link) =>
      `Здравствуйте!\n\nДля восстановления пароля перейдите по ссылке:\n${link}\n\nСсылка действует 1 час. Если вы не запрашивали сброс, просто проигнорируйте это письмо.`,
  },
};

export function passwordResetMail(to, link, lang = "uz") {
  const tpl = T[lang] || T.uz;
  return sendMail({ to, subject: tpl.subject, text: tpl.body(link) });
}
