"use client";
import { useState } from "react";
import { Icon, useToast } from "./ui";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";

/** Ikki bosqichli tasdiqlashni yoqish/o'chirish kartasi */
export default function TwoFactorCard({ enabled, onChange }) {
  const { t } = useI18n();
  const toast = useToast();
  const [setup, setSetup] = useState(null);   // {secret, qr}
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function start() {
    setBusy(true);
    const res = await post("/api/auth/2fa/setup");
    setBusy(false);
    if (!res.ok) return toast(t("common.error"), t(`err.${res.error.code}`), "error");
    setSetup(res.data);
    setBackup(null);
    setCode("");
  }

  async function confirm() {
    setBusy(true);
    const res = await post("/api/auth/2fa/enable", { code });
    setBusy(false);
    if (!res.ok) return toast(t("common.error"), t(`err.${res.error.code}`), "error");
    setBackup(res.data.backupCodes);
    setSetup(null);
    setCode("");
    onChange?.(true);
    toast(t("twofa.enabledMsg"));
  }

  async function disable() {
    setBusy(true);
    const res = await post("/api/auth/2fa/disable", { code });
    setBusy(false);
    if (!res.ok) return toast(t("common.error"), t(`err.${res.error.code}`), "error");
    setCode("");
    onChange?.(false);
    toast(t("twofa.disabledMsg"), "", "info");
  }

  function copySecret() {
    navigator.clipboard?.writeText(setup.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>
          <span className="head-ico purple"><Icon name="shieldCheck" /></span>
          {t("twofa.title")}
        </h3>
        <span className={`badge ${enabled ? "green" : ""}`}>
          {enabled ? t("common.enabled") : t("common.disabled")}
        </span>
      </div>

      <p className="body-text" style={{ marginBottom: 14 }}>{t("twofa.subtitle")}</p>

      {backup && (
        <div className="note" style={{ marginTop: 0, marginBottom: 16, alignItems: "flex-start" }}>
          <span className="note-ico"><Icon name="key" /></span>
          <div>
            <p><strong>{t("twofa.backupTitle")}.</strong> {t("twofa.backupHint")}</p>
            <div className="backup-grid">
              {backup.map((c) => <div className="backup-code" key={c}>{c}</div>)}
            </div>
          </div>
        </div>
      )}

      {!enabled && !setup && (
        <button className="primary-btn" onClick={start} disabled={busy}>
          <Icon name="shieldCheck" /> {t("twofa.enable")}
        </button>
      )}

      {!enabled && setup && (
        <div className="twofa-grid">
          <div className="qr-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR" />
          </div>
          <div>
            <p className="body-text">{t("twofa.step1")}</p>
            <p className="body-text" style={{ marginTop: 6 }}>{t("twofa.step2")}</p>
            <div style={{ margin: "14px 0 6px", fontSize: 12.5, color: "var(--muted)" }}>
              {t("twofa.manual")}
            </div>
            <div className="secret-key">
              <span>{setup.secret}</span>
              <button className="mini-btn" onClick={copySecret}>
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field full">
                <label>{t("twofa.code")}</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric"
                  placeholder="123456" style={{ letterSpacing: 3, fontWeight: 700 }} />
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: 14 }}>
              <button className="secondary-btn" onClick={() => setSetup(null)}>{t("common.cancel")}</button>
              <button className="primary-btn" onClick={confirm} disabled={busy || code.length < 6}>
                {t("twofa.confirmEnable")}
              </button>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            {t("twofa.disableHint")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("twofa.code")}
              style={{
                flex: "1 1 180px", padding: "12px 14px", borderRadius: 13,
                border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 13.2,
              }}
            />
            <button className="danger-btn" onClick={disable} disabled={busy || code.length < 5}>
              {t("twofa.disable")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
