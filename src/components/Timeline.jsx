"use client";
import { useCallback, useEffect, useState } from "react";
import { Empty, Icon } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { get } from "@/lib/api";

const KIND = {
  appointment: { icon: "calendar", tone: "blue" },
  analysis: { icon: "flask", tone: "green" },
  encounter: { icon: "clipboard", tone: "purple" },
};

/** Bemorning yagona tibbiy lentasi. patientId berilmasa — o'zinikini ko'rsatadi. */
export default function Timeline({ patientId, compact }) {
  const { t, fd, ft, status } = useI18n();
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    const res = await get(`/api/timeline${patientId ? `?patient=${patientId}` : ""}`);
    setItems(res.ok ? res.data.items || [] : []);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  if (items === null) {
    return (
      <div className="tl">
        {[0, 1, 2].map((i) => (
          <div className="tl-row" key={i}>
            <span className="tl-dot skeleton" style={{ borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: "45%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: "70%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <Empty icon="clipboard" tone="blue" title={t("timeline.empty")} text={t("timeline.emptyText")} />;
  }

  return (
    <div className="tl">
      {items.slice(0, compact ? 8 : 120).map((it) => {
        const k = KIND[it.kind] || KIND.appointment;
        return (
          <div className={`tl-row ${it.kind}`} key={`${it.kind}-${it.id}`}>
            <span className={`tl-dot ${k.tone}`}><Icon name={k.icon} /></span>
            <div className="tl-body">
              <div className="tl-head">
                <span className="tl-kind">{t(`kind.${it.kind}`)}</span>
                <time>{fd(it.at)} · {ft(it.at)}</time>
              </div>
              <strong>{it.title || "—"}</strong>
              {it.kind === "analysis" && (
                <div className="tl-meta">
                  <b>{it.value}</b>
                  <span className={`flag ${it.flag}`}>{t(`flag.${it.flag}`)}</span>
                </div>
              )}
              {it.kind === "appointment" && (
                <div className="tl-meta">
                  <span className="badge">{status(it.status)}</span>
                  {it.doctorName && <span>{it.doctorName}</span>}
                </div>
              )}
              {it.kind === "encounter" && (
                <>
                  {it.plan && <p className="tl-note">{it.plan}</p>}
                  <div className="tl-meta">
                    {it.doctorName && <span>{it.doctorName}</span>}
                    {it.prescriptions > 0 && (
                      <span className="badge purple">
                        <Icon name="pill" style={{ width: 13, height: 13 }} /> {it.prescriptions}
                      </span>
                    )}
                  </div>
                </>
              )}
              {it.note && it.kind !== "encounter" && <p className="tl-note">{it.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
