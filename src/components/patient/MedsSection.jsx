"use client";
import { useEffect, useState } from "react";
import { Empty, Icon } from "@/components/ui";
import { get } from "@/lib/api";

/* ---------------- BEMOR: DORI ESLATMALARI ---------------- */
export function MedsSection({ i18n }) {
  const { t, fd } = i18n;
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    get("/api/reminders").then((r) => {
      if (!alive) return;
      if (r.ok) setList(r.data.reminders || []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="page-head">
        <div><h2>{t("meds.title")}</h2><p>{t("meds.subtitle")}</p></div>
      </div>

      {loaded && list.length === 0 ? (
        <div className="card">
          <Empty icon="pill" title={t("meds.emptyTitle")} text={t("meds.emptyText")} />
        </div>
      ) : (
        <div className="grid-2">
          {list.map((r) => (
            <div className="card" key={r.id}>
              <div className="card-head">
                <h3><span className="head-ico amber"><Icon name="pill" /></span> {r.name}</h3>
                {r.dose && <span className="badge purple">{r.dose}</span>}
              </div>

              <div className="sec-title">{t("meds.times")}</div>
              <div className="chips">
                {r.times.map((tm) => (
                  <span className="chip on" key={tm}>
                    <Icon name="clock" style={{ width: 14, height: 14 }} /> {tm}
                  </span>
                ))}
              </div>

              <p className="body-text" style={{ marginTop: 12 }}>
                {r.startDate || r.endDate ? (
                  <>
                    <b>{t("meds.period")}:</b>{" "}
                    {r.startDate ? fd(r.startDate) : "…"} — {r.endDate ? fd(r.endDate) : t("meds.ongoing")}
                  </>
                ) : (
                  <span style={{ color: "var(--muted)" }}>{t("meds.daily")}</span>
                )}
              </p>
              {r.doctorName && (
                <p className="body-text" style={{ color: "var(--muted)" }}>
                  {t("meds.byDoctor")}: {r.doctorName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
