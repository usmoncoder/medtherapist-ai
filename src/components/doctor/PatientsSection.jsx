"use client";
import { useState } from "react";
import { Avatar, Empty, Icon, ageFrom } from "@/components/ui";

/* ---------------- BEMORLAR ---------------- */
export function PatientsSection({ patients, onOpen, i18n }) {
  const { t, fd } = i18n;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const list = patients.filter((p) => {
    const okTab =
      tab === "all" ||
      (tab === "assigned" && p.assigned) ||
      (tab === "others" && !p.assigned) ||
      (tab === "critical" && p.criticalCount > 0);
    return okTab && p.fullName.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <div className="page-head">
        <div><h2>{t("patients.title")}</h2><p>{t("patients.total", { n: patients.length })}</p></div>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="field-search">
            <Icon name="search" strokeWidth="2" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t("patients.searchByName")} aria-label={t("patients.searchByName")} />
          </div>
          <div className="tabs">
            {[
              ["all", t("common.all")],
              ["assigned", t("patients.assigned")],
              ["others", t("patients.others")],
              ["critical", t("analysis.critical")],
            ].map(([key, label]) => (
              <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <Empty title={t("patients.emptyTitle")} text={t("patients.emptyText")} />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("appt.patient")}</th>
                  <th scope="col">{t("patients.ageGender")}</th>
                  <th scope="col">{t("patients.chronicCol")}</th>
                  <th scope="col">{t("nav.analyses")}</th>
                  <th scope="col">{t("patients.lastAppt")}</th>
                  <th scope="col">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => onOpen(p.id)}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={p.fullName} size="sm" />
                        <div>
                          <strong>{p.fullName}</strong>
                          <small>{p.profile?.phone || p.email}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label={t("patients.ageGender")}>
                      {ageFrom(p.profile?.birthDate) != null
                        ? `${ageFrom(p.profile.birthDate)} ${t("common.years")}`
                        : "—"}
                      {p.profile?.gender
                        ? `, ${t(`profile.${p.profile.gender === "erkak" ? "male" : "female"}`)}`
                        : ""}
                    </td>
                    <td data-label={t("patients.chronicCol")}>{p.profile?.chronicConditions?.join(", ") || "—"}</td>
                    <td data-label={t("nav.analyses")}>
                      {p.analysisCount || 0}
                      {p.criticalCount > 0 && (
                        <span className="flag kritik" style={{ marginLeft: 6 }}>{p.criticalCount}</span>
                      )}
                    </td>
                    <td data-label={t("patients.lastAppt")}>{p.lastAppointment ? fd(p.lastAppointment.at) : "—"}</td>
                    <td data-label={t("common.status")}>
                      <span className={`badge ${p.assigned ? "green" : ""}`}>
                        {p.assigned ? t("patients.assigned") : t("patients.inChat")}
                      </span>
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
