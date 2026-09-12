"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICT, LANGS, MONTHS } from "./dictionary";

const DEFAULT = "uz";
const STORAGE = "mt-lang";
const I18nCtx = createContext(null);

const pad = (n) => String(n).padStart(2, "0");

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved;
    try {
      saved = localStorage.getItem(STORAGE);
    } catch {}
    if (!saved) {
      const nav = (navigator.language || "").toLowerCase();
      saved = nav.startsWith("ru") ? "ru" : DEFAULT;
    }
    const next = DICT[saved] ? saved : DEFAULT;
    setLangState(next);
    document.documentElement.lang = next === "ru" ? "ru" : "uz";
    setReady(true);
  }, []);

  const setLang = useCallback((next) => {
    if (!DICT[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE, next);
      document.cookie = `mt_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    document.documentElement.lang = next === "ru" ? "ru" : "uz";
  }, []);

  const value = useMemo(() => {
    const table = DICT[lang] || DICT[DEFAULT];

    const t = (key, vars) => {
      let s = table[key] ?? DICT[DEFAULT][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    };

    // Sanalarni raqamli formatda ko'rsatamiz — barcha tillarda bir xil o'qiladi
    const fd = (d) => {
      if (!d) return "—";
      const x = new Date(d);
      if (Number.isNaN(x.getTime())) return "—";
      return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
    };
    const ft = (d) => {
      if (!d) return "—";
      const x = new Date(d);
      if (Number.isNaN(x.getTime())) return "—";
      return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
    };
    const fdt = (d) => (d ? `${fd(d)}, ${ft(d)}` : "—");

    return {
      lang,
      setLang,
      ready,
      langs: LANGS,
      t,
      fd,
      ft,
      fdt,
      status: (s) => t(`status.${s}`),
      monthName: (i) => (MONTHS[lang] || MONTHS[DEFAULT])[i],
      // API xato javobini tarjima qilamiz (kod bo'lmasa server matni qoladi)
      apiError: (data) => (data?.code ? t(`err.${data.code}`) : data?.error || t("err.SERVER_ERROR")),
    };
  }, [lang, setLang, ready]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n faqat I18nProvider ichida ishlaydi");
  return ctx;
}

export { LANGS };
