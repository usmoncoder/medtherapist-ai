"use client";
import { useMemo } from "react";
import { Donut, Empty, Legend } from "@/components/ui";

/* ---------------- STATISTIKA ---------------- */
export function StatsSection({ patients, appts, dxData, i18n }) {
  const { t, monthName } = i18n;
  const months = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = appts.filter((a) => {
        const x = new Date(a.startsAt);
        return x >= d && x < next;
      }).length;
      out.push({ label: monthName(d.getMonth()), count });
    }
    return out;
  }, [appts, monthName]);

  const max = Math.max(1, ...months.map((m) => m.count));
  const done = appts.filter((a) => a.status === "yakunlangan").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{t("stats.title")}</h2>
          <p>{t("stats.range", { p: patients.length, a: appts.length })}</p>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        {[
          [patients.length, t("stat.totalPatients")],
          [appts.length, t("stat.apptCount")],
          [done, t("stat.completedAppts")],
          [appts.filter((a) => a.status === "kutilmoqda").length, t("stat.awaitingApproval")],
        ].map(([n, l]) => (
          <div className="stat-card static" key={l}>
            <div className="stat-num">{n}</div>
            <div className="stat-label" style={{ minHeight: "auto" }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="card-head"><h3>{t("stats.dxSplit")}</h3></div>
          {dxData.length === 0 ? (
            <Empty icon="stats" title={t("stats.noData")} text={t("stats.noDataText")} />
          ) : (
            <div className="donut-wrap">
              <Donut data={dxData} centerNum={patients.length} centerTxt={t("stats.patientsUnit")} />
              <Legend data={dxData} />
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h3>{t("stats.monthly")}</h3></div>
          <div className="bars">
            {months.map((m) => (
              <div className="bar-row" key={m.label}>
                <div className="bar-top"><span>{m.label}</span><b>{m.count}</b></div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.round((m.count / max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
