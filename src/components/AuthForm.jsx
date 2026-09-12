"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BotFace, Icon } from "./ui";
import { Wordmark } from "./Logo";
import { useI18n, LANGS } from "@/lib/i18n";
import { post } from "@/lib/api";

const homeFor = (role) =>
  role === "doctor" ? "/shifokor" : role === "patient" ? "/bemor" : "/admin";

export function AuthSide() {
  const { t } = useI18n();
  return (
    <aside className="auth-side">
      <div className="brand" style={{ padding: 0 }}>
        <Wordmark title={t("app.name")} subtitle={t("app.tagline")} light />
      </div>

      <div className="auth-hero">
        <h2>
          {t("auth.heroTitle").split("\n").map((l, i) => (
            <span key={i}>{l}<br /></span>
          ))}
        </h2>
        <p>{t("auth.heroText")}</p>
        <div className="auth-points">
          {[1, 2, 3, 4].map((n) => (
            <div className="auth-point" key={n}>
              <i>{n}</i>
              <span>{t(`auth.point${n}`)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        © {new Date().getFullYear()} {t("app.name")}
      </div>
      <div className="promo-bot"><BotFace size={230} /></div>
    </aside>
  );
}

export function LangMini() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-mini" style={{ marginBottom: 22 }}>
      {LANGS.map((l) => (
        <button type="button" key={l.code} className={lang === l.code ? "on" : ""}
          onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function AuthForm({ mode }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const params = useSearchParams();
  // Sessiya yaroqsiz bo'lgani uchun chiqarib yuborilgan bo'lsa (/api/auth/expired)
  const expired = isLogin && params.get("expired") === "1";
  const { t } = useI18n();
  const [step, setStep] = useState("form"); // form | twofa
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const showError = (res) =>
    setErr(res.error?.detail || (res.error?.code ? t(`err.${res.error.code}`) : t("err.SERVER_ERROR")));

  async function submit(e) {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    const res = await post(
      `/api/auth/${isLogin ? "login" : "register"}`,
      isLogin ? { email: form.email, password: form.password } : form
    );
    setLoading(false);
    if (!res.ok) return showError(res);
    if (res.data.twoFactorRequired) {
      setStep("twofa");
      return;
    }
    router.replace(homeFor(res.data.user.role));
    router.refresh();
  }

  async function verify(e) {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    const res = await post("/api/auth/2fa/verify", { code });
    setLoading(false);
    if (!res.ok) return showError(res);
    router.replace(homeFor(res.data.user.role));
    router.refresh();
  }

  return (
    <main className="auth-wrap">
      <AuthSide />

      <section className="auth-main">
        {step === "twofa" ? (
          <form className="auth-card" onSubmit={verify}>
            <LangMini />
            <h2>{t("twofa.loginTitle")}</h2>
            <p>{t("twofa.loginSub")}</p>
            <div className="form-grid">
              <div className="field full">
                <label>{t("twofa.code")}</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  style={{ letterSpacing: 4, fontSize: 18, textAlign: "center", fontWeight: 700 }}
                />
              </div>
              {err && <div className="field full"><div className="auth-err" role="alert">{err}</div></div>}
            </div>
            <button className="primary-btn full" type="submit" disabled={loading || code.length < 5}>
              {loading ? t("common.waiting") : t("twofa.verify")}
            </button>
            <p className="auth-foot">
              <button type="button" className="ghost-btn" onClick={() => { setStep("form"); setErr(""); }}>
                {t("common.back")}
              </button>
            </p>
          </form>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <LangMini />
            <h2>{isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
            <p>{t("auth.subtitle")}</p>

            {expired && (
              <div className="auth-note" role="status">
                <Icon name="info" />
                <span>{t("auth.sessionExpired")}</span>
              </div>
            )}

            <div className="form-grid">
              {!isLogin && (
                <div className="field full">
                  <label>{t("auth.fullName")} <span>*</span></label>
                  <input value={form.fullName} onChange={set("fullName")} autoComplete="name" />
                </div>
              )}
              {!isLogin && (
                <div className="field full">
                  <label>{t("auth.phone")}</label>
                  <input value={form.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" autoComplete="tel" />
                </div>
              )}
              <div className="field full">
                <label>{t("auth.email")} <span>*</span></label>
                <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="mail@example.uz" />
              </div>
              <div className="field full">
                <label>{t("auth.password")} <span>*</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? t("auth.yourPassword") : t("auth.passwordHint")}
                />
              </div>
              {err && <div className="field full"><div className="auth-err" role="alert">{err}</div></div>}
            </div>

            {isLogin && (
              <div className="auth-alt">
                <span />
                <Link href="/forgot">{t("forgot.link")}</Link>
              </div>
            )}

            <button className="primary-btn full" type="submit" disabled={loading}>
              {loading ? t("common.waiting") : isLogin ? t("auth.login") : t("auth.register")}
            </button>

            <p className="auth-foot">
              {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <Link href={isLogin ? "/register" : "/login"}>
                {isLogin ? t("auth.goRegister") : t("auth.goLogin")}
              </Link>
            </p>

            {isLogin && (
              <div className="demo-hint">
                <b>{t("auth.demoTitle")}</b>
                <br />
                {t("role.superadmin")} — bosh@test.uz
                <br />
                {t("role.admin")} — admin@test.uz
                <br />
                {t("role.doctor")} — shifokor@test.uz
                <br />
                {t("role.patient")} — bemor@test.uz
                <br />
                {t("auth.password")} — Parol12345
              </div>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
