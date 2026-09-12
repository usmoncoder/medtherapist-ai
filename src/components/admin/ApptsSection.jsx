"use client";
import { useState } from "react";
import { Empty, STATUS_COLOR } from "@/components/ui";

/* ---------------- NAVBATLAR (kuzatuv) ---------------- */
export function ApptsSection({ appts, i18n }) {
  const { t, fd, ft, status } = i18n;
  const [tab, setTab] = useState("kutilmoqda");
  const list = appts.filter((a) => tab === "all" || a.status === tab);

  return (
    <>
      <div className="page-head">
        <div><h2>{t("appt.title")}</h2><p>{t("appt.total", { n: appts.length })}</p></div>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            {["kutilmoqda", "tasdiqlangan", "yakunlangan", "all"].map((k) => (
              <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                {k === "all" ? t("common.all") : status(k)}
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
                  <th scope="col">{t("queue.doctor")}</th>
                  <th scope="col">{t("appt.reason")}</th>
                  <th scope="col">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong style={{ color: "var(--purple)" }}>{ft(a.startsAt)}</strong>
                      <br /><small style={{ color: "var(--muted)" }}>{fd(a.startsAt)}</small>
                    </td>
                    <td data-label={t("appt.patient")}>{a.patientName}</td>
                    <td data-label={t("queue.doctor")}>{a.doctorName}</td>
                    <td data-label={t("appt.reason")}>{a.reason}</td>
                    <td data-label={t("common.status")}><span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span></td>
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
