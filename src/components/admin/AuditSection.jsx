"use client";
import { useState, useEffect } from "react";
import { Empty, Icon, Pager } from "@/components/ui";
import { get, api } from "@/lib/api";

/* ---------------- AUDIT JURNALI ---------------- */
const AUDIT_ACTIONS = [
  "all", "login", "login_failed", "patient_card_view", "patient_assign", "user_create",
  "user_update", "role_change", "analysis_create", "ai_analysis", "appointment_decide",
  "file_download", "password_reset", "2fa_enable",
];

export function AuditSection({ i18n, isSuper }) {
  const { t, fdt } = i18n;
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    get(`/api/admin/audit?action=${action}&page=${page}`).then((r) => r.ok && setData(r.data));
  }, [action, page]);

  const logs = data?.logs || [];

  return (
    <>
      <div className="page-head">
        <div><h2>{t("audit.title")}</h2><p>{t("common.total")}: {data?.total ?? "—"}</p></div>
        {isSuper && (
          <a className="secondary-btn" href={`/api/admin/audit?action=${action}&format=csv`} download>
            <Icon name="download" /> {t("audit.export")}
          </a>
        )}
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="field-search" style={{ maxWidth: 280 }}>
            <Icon name="list" strokeWidth="2" />
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              style={{
                width: "100%", height: 42, borderRadius: 13, border: "1px solid var(--border)",
                background: "var(--surface)", padding: "0 14px 0 40px", fontSize: 13,
              }}
            >
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>{a === "all" ? t("audit.all") : t(`action.${a}`)}</option>
              ))}
            </select>
          </div>
        </div>

        {logs.length === 0 ? (
          <Empty icon="list" title={t("audit.empty")} text="" />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("audit.time")}</th>
                  <th scope="col">{t("audit.actor")}</th>
                  <th scope="col">{t("audit.action")}</th>
                  <th scope="col">{t("audit.target")}</th>
                  {isSuper && <th scope="col">{t("audit.ip")}</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="audit-row">
                    <td data-label={t("audit.time")} style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{fdt(l.createdAt)}</td>
                    <td>
                      <strong style={{ fontSize: 12.8 }}>{l.actorName}</strong>
                      <br />
                      <span className={`role-tag ${l.actorRole}`}>{t(`role.${l.actorRole}`) || l.actorRole}</span>
                    </td>
                    <td data-label={t("audit.action")} className="audit-action">{t(`action.${l.action}`)}</td>
                    <td>
                      {l.targetName || "—"}
                      {l.meta && (
                        <div className="audit-meta">
                          {Object.entries(l.meta).slice(0, 2).map(([k, v]) => `${k}=${v}`).join(" ")}
                        </div>
                      )}
                    </td>
                    {isSuper && <td data-label={t("audit.ip")} className="audit-meta">{l.ip || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={data?.page || 1} pages={data?.pages || 1} onPage={setPage} label={t("common.page")} />
      </div>
    </>
  );
}
