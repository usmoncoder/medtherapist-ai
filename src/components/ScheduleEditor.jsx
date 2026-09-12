"use client";
import { useEffect, useState } from "react";
import { Empty, Icon, useToast } from "./ui";
import { useI18n } from "@/lib/i18n";
import { get, api } from "@/lib/api";

const DEFAULT_ROW = { weekday: 1, from: "09:00", to: "17:00" };

export default function ScheduleEditor() {
  const { t } = useI18n();
  const toast = useToast();
  const [slotMin, setSlotMin] = useState(30);
  const [rows, setRows] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [newDayOff, setNewDayOff] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    get("/api/schedule").then((res) => {
      if (res.ok) {
        setSlotMin(res.data.schedule.slotMin);
        setRows(res.data.schedule.workdays);
        setDaysOff(res.data.schedule.daysOff);
      }
      setLoaded(true);
    });
  }, []);

  const setRow = (i, patch) =>
    setRows((r) => r.map((row, k) => (k === i ? { ...row, ...patch } : row)));

  async function save() {
    for (const r of rows) {
      if (r.from >= r.to) return toast(t("toast.failed"), t("schedule.from") + " < " + t("schedule.to"), "warn");
    }
    setBusy(true);
    const res = await api("/api/schedule", {
      method: "PUT",
      body: { slotMin: Number(slotMin), workdays: rows, daysOff },
    });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    toast(t("schedule.saved"));
  }

  if (!loaded) return <div className="card"><div className="skeleton" style={{ height: 120 }} /></div>;

  return (
    <>
      <div className="page-head">
        <div><h2>{t("schedule.title")}</h2><p>{t("sub.schedule")}</p></div>
        <button className="primary-btn" onClick={save} disabled={busy}>
          {busy ? t("common.saving") : t("common.saveChanges")}
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h3><span className="head-ico blue"><Icon name="clock" /></span> {t("schedule.workdays")}</h3>
          <button className="ghost-btn outline" onClick={() => setRows((r) => [...r, { ...DEFAULT_ROW }])}>
            + {t("schedule.addRow")}
          </button>
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>{t("schedule.slotMin")}</label>
            <select value={slotMin} onChange={(e) => setSlotMin(Number(e.target.value))}>
              {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty icon="calendar" title={t("schedule.empty")} text={t("schedule.hint")} />
        ) : (
          rows.map((r, i) => (
            <div className="sched-row" key={i}>
              <div className="field">
                <label>{t("schedule.day")}</label>
                <select value={r.weekday} onChange={(e) => setRow(i, { weekday: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>{t(`weekday.${d}`)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t("schedule.from")}</label>
                <input type="time" value={r.from} step="900" onChange={(e) => setRow(i, { from: e.target.value })} />
              </div>
              <div className="field">
                <label>{t("schedule.to")}</label>
                <input type="time" value={r.to} step="900" onChange={(e) => setRow(i, { to: e.target.value })} />
              </div>
              <button className="mini-btn red" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                {t("schedule.remove")}
              </button>
            </div>
          ))
        )}

        <div className="note" style={{ marginTop: 16 }}>
          <span className="note-ico"><Icon name="info" /></span>
          <p>{t("schedule.hint")}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3><span className="head-ico amber"><Icon name="calendar" /></span> {t("schedule.daysOff")}</h3>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="date"
            value={newDayOff}
            onChange={(e) => setNewDayOff(e.target.value)}
            style={{
              padding: "12px 14px", borderRadius: 13, border: "1px solid var(--border)",
              background: "var(--surface-2)", fontSize: 13.2,
            }}
          />
          <button
            className="secondary-btn"
            disabled={!newDayOff || daysOff.includes(newDayOff)}
            onClick={() => { setDaysOff((d) => [...d, newDayOff].sort()); setNewDayOff(""); }}
          >
            + {t("schedule.addDayOff")}
          </button>
        </div>
        <div className="dayoff-list">
          {daysOff.map((d) => (
            <span className="dayoff" key={d}>
              {d}
              <button onClick={() => setDaysOff((x) => x.filter((y) => y !== d))} aria-label="x">
                <Icon name="close" strokeWidth="2.6" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
