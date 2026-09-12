"use client";
import { useState, useEffect, useCallback } from "react";
import { Empty, Icon, STATUS_COLOR } from "@/components/ui";
import { get, post, api } from "@/lib/api";

/* ---------------- NAVBAT (slot bo'yicha) ---------------- */
export function QueueSection({ appts, myDoctor, onDone, onCancel, toast, i18n }) {
  const { t, fd, ft, status } = i18n;
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState(null);
  const [reason, setReason] = useState("");
  const [picked, setPicked] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("all");

  const loadSlots = useCallback(async () => {
    if (!myDoctor) return;
    setLoading(true);
    setPicked("");
    const res = await get(`/api/schedule/${myDoctor.id}?date=${date}`);
    setLoading(false);
    setSlots(res.ok ? res.data : { slots: [], reason: "SCHEDULE_MISSING" });
  }, [myDoctor, date]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const list = appts.filter((a) => tab === "all" || a.status === tab);

  async function submit() {
    if (!picked) return toast(t("toast.fillDate"), t("slots.pick"), "warn");
    if (!reason.trim()) return toast(t("toast.fillReason"), t("toast.fillReasonSub"), "warn");
    setBusy(true);
    const res = await post("/api/appointments", { startsAt: picked, reason });
    setBusy(false);
    if (!res.ok) {
      return toast(t("toast.failed"), res.error?.detail || t(`err.${res.error.code}`), "error");
    }
    setReason("");
    setPicked("");
    await onDone();
    await loadSlots();
    toast(t("toast.apptSent"), t("toast.apptSentSub"), "info");
  }

  const TABS = [
    ["all", t("common.all")],
    ["kutilmoqda", status("kutilmoqda")],
    ["tasdiqlangan", status("tasdiqlangan")],
    ["yakunlangan", status("yakunlangan")],
  ];

  return (
    <>
      <div className="page-head">
        <div><h2>{t("queue.title")}</h2><p>{t("queue.subtitle")}</p></div>
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="card-head">
            <h3><span className="head-ico purple"><Icon name="plus" /></span> {t("queue.newRequest")}</h3>
          </div>

          {!myDoctor ? (
            <Empty icon="user" title={t("patient.waiting")} text={t("patient.assignedByAdmin")} />
          ) : (
            <>
              <div className="form-grid">
                <div className="field full">
                  <label>{t("queue.doctor")}</label>
                  <input value={`${myDoctor.fullName} — ${myDoctor.profile?.specialty || ""}`} readOnly
                    style={{ opacity: 0.75 }} />
                </div>
                <div className="field full">
                  <label>{t("common.date")} <span>*</span></label>
                  <input type="date" value={date} min={today}
                    max={new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="sec-title">{t("slots.pick")}</div>
              {loading ? (
                <div className="slot-note">{t("slots.loading")}</div>
              ) : !slots?.slots?.length ? (
                <div className="slot-note">
                  {slots?.reason === "SCHEDULE_MISSING"
                    ? t("slots.scheduleMissing")
                    : slots?.reason === "DAY_OFF"
                    ? t("slots.dayOff")
                    : t("slots.none")}
                </div>
              ) : (
                <div className="slot-grid">
                  {slots.slots.map((s) => (
                    <button
                      key={s.iso}
                      className={`slot ${picked === s.iso ? "on" : ""}`}
                      disabled={!s.available}
                      onClick={() => setPicked(s.iso)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="field full">
                  <label>{t("queue.reason")} <span>*</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder={t("queue.reasonPlaceholder")} />
                </div>
              </div>

              <button className="primary-btn full" onClick={submit} disabled={busy || !picked}>
                {busy ? t("queue.sending") : t("queue.send")}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3><span className="head-ico blue"><Icon name="calendar" /></span> {t("queue.myAppts")}</h3>
          </div>
          <div className="tabs" style={{ marginBottom: 14 }}>
            {TABS.map(([key, label]) => (
              <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <Empty icon="calendar" title={t("queue.emptyTitle")} text={t("queue.emptyText")} />
          ) : (
            <div className="appt-list">
              {list.map((a) => (
                <div className="appt-row" key={a.id}>
                  <span className="appt-time">{ft(a.startsAt)}</span>
                  <span className="appt-info">
                    <strong>{a.peer.fullName}</strong>
                    <small>{fd(a.startsAt)} · {a.reason}</small>
                    {a.doctorNote && (
                      <small style={{ color: "var(--purple)" }}>{t("appt.doctorNote")}: {a.doctorNote}</small>
                    )}
                  </span>
                  <span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span>
                  {["kutilmoqda", "tasdiqlangan"].includes(a.status) && (
                    <button className="mini-btn red" onClick={() => onCancel(a.id)}>{t("queue.cancel")}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
