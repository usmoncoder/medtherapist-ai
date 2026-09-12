"use client";
import { useEffect, useRef, useState } from "react";
import { BotFace, Empty, Icon } from "./ui";
import { useI18n } from "@/lib/i18n";
import { get, post } from "@/lib/api";
import { getSymptoms } from "@/lib/reference";

export default function AiPanel({ patients, toast, preselect, onUsed }) {
  const { t, lang, fdt } = useI18n();
  const [form, setForm] = useState({ patientId: "", complaint: "", bp: "", pulse: "", extra: "" });
  const [symptoms, setSymptoms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [reports, setReports] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [model, setModel] = useState("");
  const timers = useRef([]);

  const STEPS = [t("ai.step1"), t("ai.step2"), t("ai.step3"), t("ai.step4")];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const loadReports = () =>
    get("/api/ai").then((res) => {
      if (!res.ok) return;
      setReports(res.data.reports || []);
      setConfigured(res.data.configured !== false);
      setModel(res.data.model || "");
    });

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (preselect) {
      setForm((f) => ({ ...f, patientId: preselect }));
      onUsed?.();
    }
  }, [preselect, onUsed]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function run() {
    if (!form.patientId) return toast(t("toast.fillPatient"), t("toast.fillPatientSub"), "warn");
    if (!form.complaint.trim())
      return toast(t("toast.fillComplaint"), t("toast.fillComplaintSub"), "warn");

    setBusy(true);
    setResult(null);
    setStep(0);
    timers.current = STEPS.map((_, i) => setTimeout(() => setStep(i), i * 700));

    const res = await post("/api/ai", { ...form, symptoms }, { lang });

    timers.current.forEach(clearTimeout);
    setBusy(false);
    setStep(-1);

    if (!res.ok) {
      const msg = res.error?.code ? t(`err.${res.error.code}`) : t("err.SERVER_ERROR");
      return toast(t("toast.aiFailed"), msg, "error");
    }
    setResult(res.data.result);
    loadReports();
    toast(
      t("toast.aiReady"),
      patients.find((p) => p.id === form.patientId)?.fullName || "",
      "info"
    );
  }

  const patient = patients.find((p) => p.id === form.patientId);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{t("ai.title")}</h2>
          <p>{t("ai.subtitle")}</p>
        </div>
        {configured ? (
          model && <span className="badge purple">{model}</span>
        ) : (
          <span className="badge amber">{t("ai.notConfigured")}</span>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="card-head">
            <h3><span className="head-ico purple"><Icon name="sparkle" /></span> {t("ai.newAnalysis")}</h3>
          </div>

          <div className="ai-box" style={{ marginBottom: 16 }}>
            <div className="ai-bot"><BotFace size={36} /></div>
            <div className="ai-box-body">
              <p>{t("ai.boxText2")}</p>
              <ul className="checklist">
                <li>{t("ai.check2")}</li>
                <li>{t("ai.check3")}</li>
                <li>{t("ai.check4")}</li>
              </ul>
            </div>
          </div>

          <div className="form-grid">
            <div className="field full">
              <label>{t("appt.patient")} <span>*</span></label>
              <select value={form.patientId} onChange={set("patientId")}>
                <option value="">{t("ai.selectPatient")}</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label>{t("ai.complaints")} <span>*</span></label>
              <textarea
                value={form.complaint}
                onChange={set("complaint")}
                placeholder={t("ai.complaintPlaceholder")}
              />
            </div>
            <div className="field full">
              <label>{t("ai.symptoms")}</label>
              <div className="chips">
                {getSymptoms(lang).map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={`chip ${symptoms.includes(s) ? "on" : ""}`}
                    onClick={() =>
                      setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>{t("ai.bp")}</label>
              <input value={form.bp} onChange={set("bp")} placeholder="155/95" />
            </div>
            <div className="field">
              <label>{t("ai.pulse")}</label>
              <input value={form.pulse} onChange={set("pulse")} placeholder="88" />
            </div>
            <div className="field full">
              <label>{t("ai.extra")}</label>
              <textarea value={form.extra} onChange={set("extra")} placeholder={t("ai.extraPlaceholder")} />
            </div>
          </div>

          <button className="primary-btn full" onClick={run} disabled={busy || !configured}>
            <Icon name="sparkle" /> {busy ? t("ai.running") : t("ai.runShort")}
          </button>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{result ? t("ai.result") : t("ai.recent")}</h3>
            {patient && result && <span className="badge purple">{patient.fullName}</span>}
          </div>

          {busy && (
            <div className="ai-loading">
              <div className="spinner" />
              <p>{t("ai.loading")}</p>
              <small>{t("ai.loadingSub")}</small>
              <div className="ai-steps">
                {STEPS.map((s, i) => (
                  <div className={`ai-step ${i <= step ? "done" : ""}`} key={s}>
                    <i>✓</i>{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!busy && result && <AiResult result={result} t={t} />}

          {!busy &&
            !result &&
            (reports.length === 0 ? (
              <Empty icon="sparkle" title={t("ai.emptyTitle")} text={t("ai.emptyText")} />
            ) : (
              <div className="recent-list">
                {reports.map((r) => (
                  <div className="recent-row" key={r.id}>
                    <span className="head-ico purple"><Icon name="sparkle" /></span>
                    <span className="r-info">
                      <strong>{r.patientName}</strong>
                      <small>{r.summary.slice(0, 70)}{r.summary.length > 70 ? "…" : ""}</small>
                    </span>
                    <span className="recent-meta"><small>{fdt(r.createdAt)}</small></span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

function AiResult({ result, t }) {
  return (
    <>
      <p className="body-text">{result.summary}</p>

      <div className="sec-title">{t("ai.differentials")}</div>
      <div className="result-card">
        {result.differentials.map((d) => (
          <div className="dx-row" key={d.name}>
            <span className="dx-name">
              {d.name}
              <br />
              <small style={{ color: "var(--muted)", fontWeight: 400 }}>{d.why}</small>
            </span>
            <span className="dx-bar"><i style={{ width: `${d.confidence}%` }} /></span>
            <span className="dx-pct">{d.confidence}%</span>
          </div>
        ))}
      </div>

      <div className="sec-title">{t("ai.investigations")}</div>
      <div className="result-card">
        <ul className="checklist">
          {result.investigations.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      <div className="sec-title">{t("ai.management")}</div>
      <div className="result-card">
        <ul className="checklist">
          {result.management.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      {result.redFlags?.length > 0 && (
        <>
          <div className="sec-title">{t("ai.redFlags")}</div>
          <div className="result-card" style={{ borderColor: "var(--red)" }}>
            <ul className="checklist">
              {result.redFlags.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </>
      )}

      <div className="disclaimer">
        <span className="note-ico" style={{ background: "transparent", color: "var(--amber)" }}>
          <Icon name="alert" strokeWidth="2" />
        </span>
        <p>
          <strong>{t("ai.disclaimerBold")}</strong> {t("ai.disclaimerRest")}
        </p>
      </div>
    </>
  );
}
