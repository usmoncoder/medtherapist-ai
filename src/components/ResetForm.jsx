"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthSide, LangMini } from "./AuthForm";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";

export default function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setErr(t("reset.mismatch"));
    setLoading(true);
    setErr("");
    const res = await post("/api/auth/reset", { token, password: pw });
    setLoading(false);
    if (!res.ok) return setErr(res.error?.detail || t(`err.${res.error.code}`));
    setDone(true);
  }

  return (
    <main className="auth-wrap">
      <AuthSide />
      <section className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <LangMini />
          <h2>{t("reset.title")}</h2>
          <p>{t("reset.subtitle")}</p>

          {!token ? (
            <>
              <div className="auth-err">{t("reset.noToken")}</div>
              <p className="auth-foot"><Link href="/forgot">{t("forgot.title")}</Link></p>
            </>
          ) : done ? (
            <>
              <div className="auth-ok">{t("reset.done")}</div>
              <p className="auth-foot"><Link href="/login">{t("auth.login")}</Link></p>
            </>
          ) : (
            <>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("reset.newPassword")} <span>*</span></label>
                  <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password" placeholder={t("auth.passwordHint")} autoFocus />
                </div>
                <div className="field full">
                  <label>{t("reset.repeat")} <span>*</span></label>
                  <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                    autoComplete="new-password" />
                </div>
                {err && <div className="field full"><div className="auth-err">{err}</div></div>}
              </div>
              <button className="primary-btn full" type="submit" disabled={loading || !pw || !pw2}>
                {loading ? t("common.waiting") : t("reset.save")}
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
