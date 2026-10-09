"use client";
import { useState } from "react";
import { Icon, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";
import { formatBp } from "@/lib/vitals";

const EMPTY = {
  subjective: "", objective: "", assessment: "", plan: "",
  bp: "", pulse: "", temp: "", weight: "", followUpAt: "",
};

/** Shifokor qabul xulosasini (SOAP) yozadi */
export default function EncounterForm({ patientId, appointmentId, onSaved, onCancel }) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [drugs, setDrugs] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setDrug = (i, k) => (e) =>
    setDrugs((d) => d.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));

  async function save() {
    if (form.assessment.trim().length < 2) {
      return toast(t("toast.failed"), t("encounter.needAssessment"), "warn");
    }
    setBusy(true);
    const res = await post("/api/encounters", {
      patientId,
      appointmentId,
      subjective: form.subjective,
      objective: form.objective,
      assessment: form.assessment,
      plan: form.plan,
      vitals: { bp: form.bp, pulse: form.pulse, temp: form.temp, weight: form.weight },
      prescriptions: drugs.filter((d) => d.name?.trim()),
      followUpAt: form.followUpAt,
    });
    setBusy(false);
    if (!res.ok) {
      return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    }
    toast(t("encounter.saved"));
    setForm(EMPTY);
    setDrugs([]);
    onSaved?.(res.data.encounter);
  }

  return (
    <div className="result-card">
      <div className="form-grid">
        <div className="field full">
          <label>{t("encounter.subjective")}</label>
          <textarea value={form.subjective} onChange={set("subjective")} placeholder={t("encounter.subjectiveHint")} />
        </div>
        <div className="field full">
          <label>{t("encounter.objective")}</label>
          <textarea value={form.objective} onChange={set("objective")} placeholder={t("encounter.objectiveHint")} />
        </div>

        <div className="field full">
          <label>{t("encounter.vitals")}</label>
          <div className="vitals-row">
            <input
              value={form.bp}
              onChange={(e) => setForm((f) => ({ ...f, bp: formatBp(e.target.value) }))}
              inputMode="numeric"
              placeholder={t("ai.bp")}
              aria-label={t("ai.bp")}
            />
            <input value={form.pulse} onChange={set("pulse")} placeholder={t("ai.pulse")} aria-label={t("ai.pulse")} />
            <input value={form.temp} onChange={set("temp")} placeholder={t("encounter.temp")} aria-label={t("encounter.temp")} />
            <input value={form.weight} onChange={set("weight")} placeholder={t("encounter.weight")} aria-label={t("encounter.weight")} />
          </div>
        </div>

        <div className="field full">
          <label>{t("encounter.assessment")} <span>*</span></label>
          <textarea value={form.assessment} onChange={set("assessment")} placeholder={t("encounter.assessmentHint")} />
        </div>
        <div className="field full">
          <label>{t("encounter.plan")}</label>
          <textarea value={form.plan} onChange={set("plan")} placeholder={t("encounter.planHint")} />
        </div>

        <div className="field full">
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1 }}>{t("encounter.prescriptions")}</span>
            <button type="button" className="ghost-btn outline"
              onClick={() => setDrugs((d) => [...d, { name: "", dose: "", duration: "" }])}>
              + {t("encounter.addDrug")}
            </button>
          </label>
          {drugs.map((d, i) => (
            <div className="rx-row" key={i}>
              <input value={d.name} onChange={setDrug(i, "name")} placeholder={t("encounter.drugName")} />
              <input value={d.dose} onChange={setDrug(i, "dose")} placeholder={t("encounter.dose")} />
              <input value={d.duration} onChange={setDrug(i, "duration")} placeholder={t("encounter.duration")} />
              <button className="mini-btn red" onClick={() => setDrugs((x) => x.filter((_, j) => j !== i))}>
                <Icon name="trash" style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>

        <div className="field">
          <label>{t("encounter.followUp")}</label>
          <input type="date" value={form.followUpAt} onChange={set("followUpAt")} />
        </div>
      </div>

      <div className="note" style={{ marginTop: 4, marginBottom: 14 }}>
        <span className="note-ico"><Icon name="info" /></span>
        <p>{t("encounter.hint")}</p>
      </div>

      <div className="form-actions" style={{ marginTop: 0 }}>
        {onCancel && <button className="secondary-btn" onClick={onCancel}>{t("common.cancel")}</button>}
        <button className="primary-btn" onClick={save} disabled={busy}>
          {busy ? t("common.saving") : t("encounter.save")}
        </button>
      </div>
    </div>
  );
}
