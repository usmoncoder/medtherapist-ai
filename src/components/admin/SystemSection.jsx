"use client";
import { useState, useEffect, useCallback } from "react";
import { Empty, Icon } from "@/components/ui";
import { get, api } from "@/lib/api";

/* ---------------- TIZIM HOLATI (faqat bosh administrator) ---------------- */
const fmtBytes = (n) =>
  !n ? "0 B" : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const fmtUptime = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} soat ${m} daq` : `${m} daq`;
};

export function SystemSection({ i18n }) {
  const { t } = i18n;
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback((fresh) => {
    setErr("");
    get(`/api/admin/system${fresh ? "?fresh=1" : ""}`).then((r) => {
      if (r.ok) setData(r.data);
      else setErr(r.error?.code ? t(`err.${r.error.code}`) : t("err.SERVER_ERROR"));
    });
  }, [t]);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <div className="card">
        <Empty icon="alert" title={t("common.error")} text={err} />
        <button className="secondary-btn" onClick={load} style={{ margin: "0 auto", display: "flex" }}>
          <Icon name="activity" /> {t("common.refresh")}
        </button>
      </div>
    );
  }
  if (!data) return <div className="card"><div className="skeleton" style={{ height: 140 }} /></div>;

  const svc = data.services;
  const dot = (on) => (
    <span
      style={{
        width: 9, height: 9, borderRadius: 9, display: "inline-block", marginRight: 8,
        background: on ? "var(--green)" : "var(--muted)",
        boxShadow: on ? "0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent)" : "none",
      }}
    />
  );

  return (
    <>
      <div className="page-head">
        <div><h2>{t("nav.system")}</h2><p>{t("sub.system")}</p></div>
        <button className="secondary-btn" onClick={() => load(true)}>
          <Icon name="activity" /> {t("common.refresh")}
        </button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {[
          ["shieldCheck", "green", data.security.twoFactorOn, "system.twoFactorOn"],
          ["userCog", "amber", data.security.unverifiedDoctors, "system.unverifiedDoctors"],
          ["alert", "red", data.security.inactive, "system.inactive"],
          ["list", "blue", data.security.auditLast24h, "system.auditLast24h"],
          ["sparkle", "purple", data.usage.aiReports, "system.aiReports"],
          ["file", "blue", data.usage.files, "system.files"],
          ["alert", "amber", data.security.clientErrors24h ?? 0, "system.clientErrors"],
        ].map(([icon, tone, value, key]) => (
          <div className="kpi" key={key}>
            <span className={`kpi-ico stat-ico ${tone}`} style={{ marginBottom: 0 }}>
              <Icon name={icon} />
            </span>
            <div><b>{value}</b><span>{t(key)}</span></div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 0 }}>
        <div className="card">
          <div className="card-head"><h3>{t("system.services")}</h3></div>
          <div className="recent-list">
            <div className="recent-row">
              <span className="r-info"><strong>{dot(svc.ai.on)}{t("system.aiModel")}</strong></span>
              <span className="recent-meta"><b>{svc.ai.on ? svc.ai.model : t("system.off")}</b></span>
            </div>
            <div className="recent-row">
              <span className="r-info"><strong>{dot(svc.mailer.on)}{t("system.mailer")}</strong></span>
              <span className="recent-meta"><b>{svc.mailer.on ? t("system.on") : t("system.off")}</b></span>
            </div>
            <div className="recent-row">
              <span className="r-info"><strong>{dot(svc.redis.on)}{t("system.redis")}</strong></span>
              <span className="recent-meta"><b>{svc.redis.on ? t("system.on") : t("system.off")}</b></span>
            </div>
            <div className="recent-row">
              <span className="r-info"><strong>{dot(svc.realtime.on)}{t("system.realtime")}</strong></span>
              <span className="recent-meta"><b>{svc.realtime.on ? t("system.on") : t("system.off")}</b></span>
            </div>
            <div className="recent-row">
              <span className="r-info"><strong>{dot(svc.encryption?.on)}{t("security.encryption")}</strong></span>
              <span className="recent-meta"><b>{svc.encryption?.on ? t("system.on") : t("system.off")}</b></span>
            </div>
          </div>

          <div className="sec-title">{t("system.runtime")}</div>
          <div className="info-grid">
            <div className="info-item"><small>{t("system.node")}</small><b>{data.runtime.node}</b></div>
            <div className="info-item"><small>{t("system.env")}</small><b>{data.runtime.env}</b></div>
            <div className="info-item"><small>{t("system.uptime")}</small><b>{fmtUptime(data.runtime.uptimeSec)}</b></div>
            <div className="info-item"><small>{t("system.memory")}</small><b>{data.runtime.memoryMb} MB</b></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("system.db")}</h3>
            <span className={`badge ${data.db.status === "up" ? "green" : "red"}`}>{data.db.status}</span>
          </div>
          <div className="info-grid" style={{ marginBottom: 14 }}>
            <div className="info-item"><small>{t("common.name")}</small><b>{data.db.name}</b></div>
            <div className="info-item"><small>{t("system.storage")}</small><b>{fmtBytes(data.usage.fileBytes)}</b></div>
          </div>
          <div className="sec-title">{t("system.collections")}</div>
          <div className="table-wrap">
            <table style={{ minWidth: 0 }}>
              <tbody>
                {Object.entries(data.db.collections).sort().map(([name, n]) => (
                  <tr key={name}>
                    <td style={{ fontSize: 12.6 }}>{name}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ClientErrors t={t} fdt={i18n.fdt} />

      <div className="card">
        <div className="note" style={{ marginTop: 0 }}>
          <span className="note-ico"><Icon name="shieldCheck" /></span>
          <p>{t("system.hint")}</p>
        </div>
      </div>
    </>
  );
}

/* Brauzerda yuz bergan xatolar — faqat bosh administratorga */
function ClientErrors({ t, fdt }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    get("/api/client-errors").then((r) => setList(r.ok ? r.data.errors || [] : []));
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <h3>
          <span className="head-ico amber"><Icon name="alert" /></span>
          {t("system.clientErrors")}
        </h3>
        {list?.length > 0 && <span className="badge amber">{list.length}</span>}
      </div>

      {list === null ? (
        <div className="sk-row">
          <div className="sk-line" style={{ width: "60%" }} />
          <div className="sk-line" style={{ width: "40%" }} />
        </div>
      ) : list.length === 0 ? (
        <Empty icon="shieldCheck" tone="green" title={t("system.noErrors")} text="" />
      ) : (
        <div className="recent-list">
          {list.slice(0, 8).map((e) => (
            <div className="recent-row" key={e.id}>
              <span className="head-ico amber"><Icon name="alert" /></span>
              <span className="r-info">
                <strong style={{ overflowWrap: "anywhere" }}>{e.message}</strong>
                <small>{e.page || "—"} · {e.role}</small>
              </span>
              <span className="recent-meta">
                <small>{fdt(e.lastAt)}</small>
                <b>{e.count} {t("system.errorCount")}</b>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
