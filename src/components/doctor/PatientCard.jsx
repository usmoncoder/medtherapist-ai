"use client";
import { useEffect, useState } from "react";
import { Avatar, FileChip, Icon, Modal, STATUS_COLOR, ageFrom } from "@/components/ui";
import { get, post, patch, del, api } from "@/lib/api";
import { getAllergyChips } from "@/lib/reference";
import FileUploader from "@/components/FileUploader";
import EncounterForm from "@/components/EncounterForm";

/* ---------------- BEMOR KARTASI + ANALIZ KIRITISH ---------------- */
const EMPTY_ANALYSIS = {
  name: "", value: "", unit: "", refRange: "", flag: "norma", takenAt: "", doctorComment: "",
};

export function PatientCard({ data, onClose, onAi, onReload, toast, i18n }) {
  const { t, fd, ft, status } = i18n;
  const [form, setForm] = useState(EMPTY_ANALYSIS);
  const [files, setFiles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editMed, setEditMed] = useState(false);
  const [writingEnc, setWritingEnc] = useState(false);
  const [encounters, setEncounters] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pid = data?.patient?.id;
  useEffect(() => {
    if (!pid) return;
    let alive = true;
    get(`/api/encounters?patient=${pid}`).then((r) => {
      if (alive && r.ok) setEncounters(r.data.encounters || []);
    });
    return () => { alive = false; };
  }, [pid]);

  if (!data) return null;
  const p = data.patient;
  const pr = p.profile || {};
  const age = ageFrom(pr.birthDate);

  async function addAnalysis() {
    if (!form.name.trim()) return toast(t("toast.fillName"), t("toast.fillNameSub"), "warn");
    if (!String(form.value).trim()) return toast(t("toast.fillValue"), t("toast.fillValueSub"), "warn");
    setBusy(true);
    const res = await post("/api/analyses", {
      ...form,
      patientId: p.id,
      attachments: files.map((f) => f.id),
    });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    setForm(EMPTY_ANALYSIS);
    setFiles([]);
    setAdding(false);
    toast(t("toast.analysisAdded"), form.name);
    onReload();
  }

  async function comment(id, doctorComment) {
    const res = await patch(`/api/analyses/${id}`, { doctorComment });
    if (!res.ok) return toast(t("toast.notSaved"), "", "error");
    toast(t("toast.commentSaved"));
    onReload();
  }

  async function remove(id) {
    const res = await del(`/api/analyses/${id}`);
    if (!res.ok) return toast(t("toast.failed"), "", "error");
    toast(t("toast.analysisDeleted"), "", "info");
    onReload();
  }

  return (
    <Modal
      open
      wide
      title={t("patients.card")}
      onClose={onClose}
      foot={
        <>
          <button className="secondary-btn" onClick={onClose}>{t("common.close")}</button>
          <button className="secondary-btn" onClick={() => window.print()}>
            <Icon name="download" /> {t("common.print")}
          </button>
          <button className="primary-btn" onClick={() => onAi(p.id)}>
            <Icon name="sparkle" /> {t("ai.aiAnalyze")}
          </button>
        </>
      }
    >
      <div className="p-head">
        <Avatar name={p.fullName} />
        <div>
          <h4>{p.fullName}</h4>
          <small>
            {age != null ? `${age} ${t("common.years")} · ` : ""}
            {pr.gender ? t(`profile.${pr.gender === "erkak" ? "male" : "female"}`) : "—"} ·{" "}
            {pr.phone || p.email}
          </small>
        </div>
        <span className={`badge ${p.assigned ? "green" : ""}`} style={{ marginLeft: "auto" }}>
          {p.assigned ? t("patients.assigned") : t("patients.inChat")}
        </span>
      </div>

      <div className="info-grid">
        <div className="info-item"><small>{t("profile.bloodType")}</small><b>{pr.bloodType || "—"}</b></div>
        <div className="info-item"><small>{t("profile.address")}</small><b>{pr.address || "—"}</b></div>
        <div className="info-item">
          <small>{t("patients.allergyCol")}</small>
          <b>{pr.allergies?.join(", ") || t("common.none")}</b>
        </div>
        <div className="info-item">
          <small>{t("profile.chronic")}</small>
          <b>{pr.chronicConditions?.join(", ") || "—"}</b>
        </div>
      </div>

      <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1 }}>{t("medical.title")}</span>
        <button className="ghost-btn outline" onClick={() => setEditMed((v) => !v)}>
          {editMed ? t("common.cancel") : t("medical.edit")}
        </button>
      </div>

      {editMed ? (
        <MedicalForm patient={p} i18n={i18n} toast={toast} onSaved={() => { setEditMed(false); onReload(); }} />
      ) : (
        <>
          <p className="body-text" style={{ marginBottom: 10 }}>
            <b>{t("profile.complaint")}:</b> {pr.complaint || t("patients.notEntered")}
          </p>
          <p className="body-text">
            <b>{t("profile.history")}:</b> {pr.history || t("patients.notEntered")}
          </p>
        </>
      )}

      <div className="sec-title">{t("appt.title")}</div>
      {data.appointments.length === 0 ? (
        <p className="body-text">{t("patient.noApptTitle")}</p>
      ) : (
        <div className="appt-list">
          {data.appointments.slice(0, 6).map((a) => (
            <div className="appt-row" key={a.id}>
              <span className="appt-time">{ft(a.startsAt)}</span>
              <span className="appt-info">
                <strong>{fd(a.startsAt)}</strong>
                <small>{a.reason}</small>
              </span>
              <span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1 }}>{t("encounter.list")}</span>
        <button className="ghost-btn outline" onClick={() => setWritingEnc((v) => !v)}>
          {writingEnc ? t("common.cancel") : `+ ${t("encounter.new")}`}
        </button>
      </div>

      {writingEnc && (
        <EncounterForm
          patientId={p.id}
          onSaved={(enc) => {
            setWritingEnc(false);
            setEncounters((list) => [enc, ...list]);
            onReload();
          }}
        />
      )}

      {encounters.length === 0 && !writingEnc ? (
        <p className="body-text">{t("encounter.none")}</p>
      ) : (
        encounters.slice(0, 5).map((e) => (
          <div className="result-card" key={e.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <strong style={{ flex: 1, fontSize: 13.5 }}>{e.assessment}</strong>
              <small style={{ color: "var(--muted)" }}>{fd(e.createdAt)}</small>
            </div>
            {e.subjective && (
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                <b>S:</b> {e.subjective}
              </p>
            )}
            {e.objective && (
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                <b>O:</b> {e.objective}
              </p>
            )}
            {e.plan && (
              <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                <b>P:</b> {e.plan}
              </p>
            )}
            {e.prescriptions?.length > 0 && (
              <div className="file-chips" style={{ marginBottom: 0 }}>
                {e.prescriptions.map((rx, i) => (
                  <span className="file-chip" key={i}>
                    <Icon name="pill" />
                    <strong>{rx.name}</strong>
                    <small>{[rx.dose, rx.duration].filter(Boolean).join(" · ")}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1 }}>{t("nav.analyses")}</span>
        <button className="ghost-btn outline" onClick={() => setAdding((v) => !v)}>
          {adding ? t("common.cancel") : `+ ${t("analysis.addForPatient")}`}
        </button>
      </div>

      {adding && (
        <div className="result-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>{t("analysis.name")} <span>*</span></label>
              <input value={form.name} onChange={set("name")} placeholder="Gemoglobin" />
            </div>
            <div className="field">
              <label>{t("analysis.value")} <span>*</span></label>
              <input value={form.value} onChange={set("value")} placeholder="96" />
            </div>
            <div className="field">
              <label>{t("analysis.unit")}</label>
              <input value={form.unit} onChange={set("unit")} placeholder="g/l" />
            </div>
            <div className="field">
              <label>{t("analysis.ref")}</label>
              <input value={form.refRange} onChange={set("refRange")} placeholder="120–150" />
            </div>
            <div className="field">
              <label>{t("analysis.flag")}</label>
              <select value={form.flag} onChange={set("flag")}>
                {["norma", "yuqori", "past", "kritik"].map((f) => (
                  <option key={f} value={f}>{t(`flag.${f}`)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("analysis.takenAt")}</label>
              <input type="date" value={form.takenAt} onChange={set("takenAt")} />
            </div>
            <div className="field full">
              <label>{t("patient.doctorComment")}</label>
              <input value={form.doctorComment} onChange={set("doctorComment")} />
            </div>
            <div className="field full">
              <FileUploader context="analysis" patientId={p.id} files={files} onChange={setFiles} />
            </div>
          </div>
          <button className="primary-btn full" onClick={addAnalysis} disabled={busy}>
            {busy ? t("common.saving") : t("common.add")}
          </button>
        </div>
      )}

      {data.analyses.length === 0 ? (
        <p className="body-text">{t("analysis.notEntered")}</p>
      ) : (
        data.analyses.map((a) => (
          <AnalysisRow key={a.id} a={a} t={t} fd={fd} onComment={comment} onRemove={remove} />
        ))
      )}
    </Modal>
  );
}

function AnalysisRow({ a, t, fd, onComment, onRemove }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="result-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <strong style={{ flex: 1, fontSize: 13.5 }}>{a.name}</strong>
        <span className="badge purple">{a.value} {a.unit}</span>
        <span className={`flag ${a.flag}`}>{t(`flag.${a.flag}`)}</span>
        <small style={{ color: "var(--muted)" }}>{fd(a.takenAt)}</small>
      </div>
      {a.refRange && (
        <p style={{ fontSize: 12.3, color: "var(--muted)" }}>{t("analysis.ref")}: {a.refRange}</p>
      )}
      {a.doctorComment && (
        <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
          {t("patient.doctorComment")}: {a.doctorComment}
        </p>
      )}
      {a.attachments?.length > 0 && (
        <div className="file-chips">
          {a.attachments.map((f) => <FileChip key={f.id} file={f} />)}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          placeholder={a.doctorComment || `${t("common.note")}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{
            flex: 1, padding: "9px 12px", borderRadius: 11,
            border: "1px solid var(--border)", background: "var(--surface)", fontSize: 12.5,
          }}
        />
        <button className="mini-btn green" onClick={() => onComment(a.id, draft)} disabled={!draft.trim()}>
          {t("common.save")}
        </button>
        <button className="mini-btn red" onClick={() => onRemove(a.id)}>
          <Icon name="trash" style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- BEMORNING TIBBIY YOZUVI (faqat shifokor tahrirlaydi) ---------------- */
function MedicalForm({ patient, i18n, toast, onSaved }) {
  const { t, lang } = i18n;
  const pr = patient.profile || {};
  const [form, setForm] = useState({
    bloodType: pr.bloodType || "",
    chronicConditions: (pr.chronicConditions || []).join(", "),
    complaint: pr.complaint || "",
    history: pr.history || "",
  });
  const [allergies, setAllergies] = useState(pr.allergies || []);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    const res = await patch(`/api/patients/${patient.id}`, { ...form, allergies });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    toast(t("medical.saved"), patient.fullName);
    onSaved();
  }

  return (
    <div className="result-card">
      <div className="form-grid">
        <div className="field">
          <label>{t("profile.bloodType")}</label>
          <input value={form.bloodType} onChange={set("bloodType")} placeholder="O+" />
        </div>
        <div className="field">
          <label>{t("profile.chronic")}</label>
          <input value={form.chronicConditions} onChange={set("chronicConditions")}
            placeholder={t("profile.chronicPlaceholder")} />
        </div>
        <div className="field full">
          <label>{t("profile.allergies")}</label>
          <div className="chips">
            {getAllergyChips(lang).map(([value, label]) => (
              <button type="button" key={value}
                className={`chip ${allergies.includes(value) ? "on" : ""}`}
                onClick={() =>
                  setAllergies((prev) =>
                    prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
                  )
                }>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label>{t("profile.complaint")}</label>
          <textarea value={form.complaint} onChange={set("complaint")}
            placeholder={t("profile.complaintPlaceholder")} />
        </div>
        <div className="field full">
          <label>{t("profile.history")}</label>
          <textarea value={form.history} onChange={set("history")}
            placeholder={t("profile.historyPlaceholder")} />
        </div>
      </div>
      <button className="primary-btn full" onClick={save} disabled={busy}>
        {busy ? t("common.saving") : t("common.saveChanges")}
      </button>
    </div>
  );
}
