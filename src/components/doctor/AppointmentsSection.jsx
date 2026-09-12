"use client";
import { useState } from "react";
import { Avatar, Empty, STATUS_COLOR } from "@/components/ui";

/* ---------------- NAVBATLAR ---------------- */
export function AppointmentsSection({ appts, onDecide, onOpen, i18n }) {
  const { t, fd, ft, status } = i18n;
  const [tab, setTab] = useState("kutilmoqda");
  const [note, setNote] = useState({});
  const list = appts.filter((a) => tab === "all" || a.status === tab);

  const TABS = [
    ["kutilmoqda", status("kutilmoqda")],
    ["tasdiqlangan", status("tasdiqlangan")],
    ["yakunlangan", status("yakunlangan")],
    ["rad etilgan", status("rad etilgan")],
    ["all", t("common.all")],
  ];

  return (
    <>
      <div className="page-head">
        <div><h2>{t("appt.title")}</h2><p>{t("appt.total", { n: appts.length })}</p></div>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            {TABS.map(([key, label]) => (
              <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <Empty icon="calendar" title={t("queue.emptyTitle")} text={t("queue.emptyText")} />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("common.time")}</th>
                  <th scope="col">{t("appt.patient")}</th>
                  <th scope="col">{t("appt.reason")}</th>
                  <th scope="col">{t("common.status")}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong style={{ color: "var(--purple)" }}>{ft(a.startsAt)}</strong>
                      <br /><small style={{ color: "var(--muted)" }}>{fd(a.startsAt)}</small>
                    </td>
                    <td>
                      <div className="cell-user" style={{ cursor: "pointer" }} onClick={() => onOpen(a.peer.id)}>
                        <Avatar name={a.peer.fullName} size="sm" />
                        <div>
                          <strong>{a.peer.fullName}</strong>
                          <small>{t("patients.openCard")}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label={t("appt.reason")}>{a.reason}</td>
                    <td data-label={t("common.status")}><span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span></td>
                    <td>
                      <div className="row-actions">
                        {a.status === "kutilmoqda" && (
                          <>
                            <input
                              placeholder={t("appt.notePlaceholder")}
                              value={note[a.id] || ""}
                              onChange={(e) => setNote((n) => ({ ...n, [a.id]: e.target.value }))}
                              style={{
                                width: 150, padding: "7px 10px", borderRadius: 10,
                                border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 12,
                              }}
                            />
                            <button className="mini-btn green" onClick={() => onDecide(a.id, "tasdiqlangan", note[a.id])}>
                              {t("appt.approve")}
                            </button>
                            <button className="mini-btn red" onClick={() => onDecide(a.id, "rad etilgan", note[a.id])}>
                              {t("appt.reject")}
                            </button>
                          </>
                        )}
                        {a.status === "tasdiqlangan" && (
                          <button className="mini-btn" onClick={() => onDecide(a.id, "yakunlangan")}>
                            {t("appt.complete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
