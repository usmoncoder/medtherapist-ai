"use client";
import { useEffect, useState } from "react";
import { Avatar, FileChip, Icon, Modal, STATUS_COLOR, ageFrom } from "@/components/ui";
import { get, post, patch, del, api } from "@/lib/api";
import { getAllergyChips } from "@/lib/reference";
import FileUploader from "@/components/FileUploader";
import EncounterForm from "@/components/EncounterForm";
import { printDocument, section, cells, esc } from "@/lib/printDoc";

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

  /* Kartaning toza, qog'ozga mos nusxasi — brauzer uni PDF qilib saqlaydi.
     Sahifaning o'zini chop etishdan farqi: menyu, tugmalar va fon yo'q,
     ma'lumot esa to'liq (ro'yxatlar qisqartirilmaydi). */
  function downloadPdf() {
    const dash = "\u2014";
    const rows = (items, cols) =>
      items.length
        ? `<table><thead><tr>${cols.map((c) => `<th>${esc(c.h)}</th>`).join("")}</tr></thead>` +
          `<tbody>${items
            .map((it) => `<tr>${cols.map((c) => `<td>${esc(c.v(it) || dash)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";

    const encounterBlocks = encounters
      .map((e) => {
        const line = (lab, val) => (val ? `<p class="text"><b>${esc(lab)}:</b> ${esc(val)}</p>` : "");
        const rx = (e.prescriptions || [])
          .map((r) => `${r.name}${[r.dose, r.duration].filter(Boolean).length
            ? ` (${[r.dose, r.duration].filter(Boolean).join(", ")})` : ""}`)
          .join("; ");
        return `<div class="block"><p class="text"><b>${esc(e.assessment)}</b>` +
          ` <span class="muted">${esc(fd(e.createdAt))}</span></p>` +
          line("S", e.subjective) + line("O", e.objective) + line("P", e.plan) +
          line(t("encounter.prescriptions"), rx) + `</div>`;
      })
      .join("");

    const html = `
      <div class="doc-head">
        <div>
          <div class="brand">${esc(t("app.name"))}</div>
          <h1>${esc(t("patients.card"))}</h1>
          <div class="sub">${esc(p.fullName)}${age != null ? ` ${dash} ${age} ${esc(t("common.years"))}` : ""}</div>
        </div>
        <div class="meta">${esc(t("print.printedAt"))}<br><b>${esc(fd(new Date()))}</b></div>
      </div>

      ${section(t("appt.patient"), cells([
        [t("auth.fullName"), p.fullName],
        [t("profile.gender"), pr.gender ? t(`profile.${pr.gender === "erkak" ? "male" : "female"}`) : dash],
        [t("auth.phone"), pr.phone || p.email || dash],
        [t("profile.bloodType"), pr.bloodType || dash],
        [t("profile.address"), pr.address || dash],
        [t("patients.allergyCol"), pr.allergies?.join(", ") || t("common.none")],
        [t("profile.chronic"), pr.chronicConditions?.join(", ") || dash],
        [t("patients.assigned"), p.assigned ? t("common.yes") : t("common.no")],
      ]))}

      ${section(t("medical.title"),
        `<p class="text"><b>${esc(t("profile.complaint"))}:</b> ${esc(pr.complaint || t("print.noData"))}</p>` +
        `<p class="text"><b>${esc(t("profile.history"))}:</b> ${esc(pr.history || t("print.noData"))}</p>`)}

      ${section(t("appt.title"), rows(data.appointments, [
        { h: t("common.date"), v: (a) => `${fd(a.startsAt)} ${ft(a.startsAt)}` },
        { h: t("appt.reason"), v: (a) => a.reason },
        { h: t("common.status"), v: (a) => status(a.status) },
      ]))}

      ${section(t("encounter.list"), encounterBlocks)}

      ${section(t("nav.analyses"), rows(data.analyses, [
        { h: t("analysis.name"), v: (a) => a.name },
        { h: t("analysis.value"), v: (a) => `${a.value} ${a.unit || ""}`.trim() },
        { h: t("analysis.ref"), v: (a) => a.refRange },
        { h: t("analysis.flag"), v: (a) => t(`flag.${a.flag}`) },
        { h: t("analysis.takenAt"), v: (a) => fd(a.takenAt) },
        { h: t("patient.doctorComment"), v: (a) => a.doctorComment },
      ]))}

      <footer>
        <span>${esc(t("app.name"))} ${dash} ${esc(t("app.tagline"))}</span>
        <span>${esc(p.fullName)}</span>
      </footer>`;

    // Sarlavha saqlanadigan PDF faylning nomiga aylanadi
    printDocument({ title: `${t("patients.card")} ${dash} ${p.fullName}`, html });
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
            <Icon name="clipboard" /> {t("common.print")}
          </button>
          <button className="secondary-btn" onClick={downloadPdf}>
            <Icon name="download" /> {t("common.downloadPdf")}
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

      <RemindersBlock pid={p.id} toast={toast} i18n={i18n} />

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

/* ---------------- DORI ESLATMALARI (TIME PILL) ---------------- */
function RemindersBlock({ pid, toast, i18n }) {
  const { t, fd } = i18n;
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", startDate: "", endDate: "" });
  const [times, setTimes] = useState(["08:00"]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function load() {
    get(`/api/reminders?patient=${pid}`).then((r) => {
      if (r.ok) setList(r.data.reminders || []);
    });
  }
  useEffect(() => {
    if (pid) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  async function add() {
    if (!form.name.trim()) return toast(t("toast.failed"), t("meds.needName"), "warn");
    const clean = [...new Set(times.filter(Boolean))].sort();
    if (!clean.length) return toast(t("toast.failed"), t("meds.needTime"), "warn");
    setBusy(true);
    const res = await post("/api/reminders", {
      patientId: pid,
      name: form.name,
      dose: form.dose,
      times: clean,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    toast(t("meds.added"), form.name);
    setForm({ name: "", dose: "", startDate: "", endDate: "" });
    setTimes(["08:00"]);
    setOpen(false);
    load();
  }

  async function remove(id) {
    const res = await del(`/api/reminders/${id}`);
    if (!res.ok) return toast(t("toast.failed"), "", "error");
    toast(t("meds.deleted"), "", "info");
    load();
  }

  return (
    <>
      <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1 }}>{t("meds.doctorTitle")}</span>
        <button className="ghost-btn outline" onClick={() => setOpen((v) => !v)}>
          {open ? t("common.cancel") : `+ ${t("meds.add")}`}
        </button>
      </div>

      {open && (
        <div className="result-card" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <div className="field">
              <label>{t("encounter.drugName")} <span>*</span></label>
              <input value={form.name} onChange={set("name")} placeholder="Amoksitsillin" />
            </div>
            <div className="field">
              <label>{t("encounter.dose")}</label>
              <input value={form.dose} onChange={set("dose")} placeholder="500 mg" />
            </div>
            <div className="field full">
              <label>{t("meds.times")}</label>
              <div className="rx-row" style={{ flexWrap: "wrap", gap: 8 }}>
                {times.map((tm, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="time"
                      value={tm}
                      onChange={(e) =>
                        setTimes((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))
                      }
                      style={{ width: "auto" }}
                    />
                    {times.length > 1 && (
                      <button className="mini-btn red" onClick={() => setTimes((arr) => arr.filter((_, j) => j !== i))}>
                        <Icon name="close" strokeWidth="2.4" style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </span>
                ))}
                {times.length < 6 && (
                  <button className="ghost-btn outline" onClick={() => setTimes((arr) => [...arr, "12:00"])}>
                    + {t("meds.addTime")}
                  </button>
                )}
              </div>
            </div>
            <div className="field">
              <label>{t("meds.start")}</label>
              <input type="date" value={form.startDate} onChange={set("startDate")} />
            </div>
            <div className="field">
              <label>{t("meds.end")}</label>
              <input type="date" value={form.endDate} onChange={set("endDate")} />
            </div>
          </div>
          <button className="primary-btn full" onClick={add} disabled={busy}>
            {busy ? t("common.saving") : t("common.add")}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="body-text">{t("meds.none")}</p>
      ) : (
        list.map((r) => (
          <div className="result-card" key={r.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Icon name="pill" />
              <strong style={{ fontSize: 13.5 }}>{r.name}</strong>
              {r.dose && <span className="badge purple">{r.dose}</span>}
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                {r.times.map((tm) => (
                  <span className="badge amber" key={tm}>{tm}</span>
                ))}
              </span>
              <button className="mini-btn red" onClick={() => remove(r.id)}>
                <Icon name="trash" style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {(r.startDate || r.endDate) && (
              <p style={{ fontSize: 12.3, color: "var(--muted)", marginTop: 6 }}>
                {r.startDate ? fd(r.startDate) : "…"} — {r.endDate ? fd(r.endDate) : t("meds.ongoing")}
              </p>
            )}
          </div>
        ))
      )}
    </>
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
