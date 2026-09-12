"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthSide, LangMini } from "./AuthForm";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";

export default function ForgotForm() {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [mailer, setMailer] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const res = await post("/api/auth/forgot", { email, lang });
    setLoading(false);
    if (!res.ok) {
      setErr(res.error?.detail || t(`err.${res.error.code}`));
      return;
    }
    setMailer(res.data.mailer !== false);
    setSent(true);
  }

  return (
    <main className="auth-wrap">
      <AuthSide />
      <section className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <LangMini />
          <h2>{t("forgot.title")}</h2>
          <p>{t("forgot.subtitle")}</p>

          {sent ? (
            <>
              <div className="auth-ok">{t("forgot.sent")}</div>
              {!mailer && <div className="demo-hint" style={{ marginTop: 12 }}>{t("forgot.devHint")}</div>}
              <p className="auth-foot"><Link href="/login">{t("forgot.backToLogin")}</Link></p>
            </>
          ) : (
            <>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("auth.email")} <span>*</span></label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email" placeholder="mail@example.uz" autoFocus />
                </div>
                {err && <div className="field full"><div className="auth-err">{err}</div></div>}
              </div>
              <button className="primary-btn full" type="submit" disabled={loading || !email}>
                {loading ? t("common.waiting") : t("forgot.send")}
              </button>
              <p className="auth-foot"><Link href="/login">{t("forgot.backToLogin")}</Link></p>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
