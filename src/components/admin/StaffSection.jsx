"use client";
import { useState, useEffect } from "react";
import { Avatar, Empty, Icon } from "@/components/ui";
import { patch, api } from "@/lib/api";

/* ---------------- HODIMLAR (faqat bosh administrator) ---------------- */
export function StaffSection({ users, onQuery, onReload, toast, i18n }) {
  const { t, fd } = i18n;
  const [tab, setTab] = useState("doctor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onQuery({ role: tab, page: 1 });
  }, [tab, onQuery]);

  async function act(id, payload, msg) {
    setBusy(true);
    const res = await patch(`/api/admin/users/${id}`, payload);
    setBusy(false);
    if (!res.ok) return toast(t("toast.failed"), t(`err.${res.error.code}`), "error");
    toast(msg);
    onReload();
  }

  const list = (users?.users || []).filter((u) => u.role === tab);

  return (
    <>
      <div className="page-head">
        <div><h2>{t("nav.staff")}</h2><p>{t("sub.staff")}</p></div>
        <span className="role-tag superadmin">{t("staff.onlySuper")}</span>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="tabs">
            {[["doctor", t("staff.doctors")], ["admin", t("staff.admins")], ["superadmin", t("role.superadmin")]].map(
              ([key, label]) => (
                <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <Empty icon="users" title={t("users.empty")} text="" />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("common.name")}</th>
                  {tab === "doctor" && <th scope="col">{t("auth.specialty")}</th>}
                  {tab === "doctor" && <th scope="col">{t("staff.verified")}</th>}
                  <th scope="col">{t("users.twofa")}</th>
                  <th scope="col">{t("users.lastSeen")}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={u.fullName} size="sm" />
                        <div>
                          <strong>{u.fullName}</strong>
                          <small>{u.email}</small>
                        </div>
                      </div>
                    </td>
                    {tab === "doctor" && (
                      <td data-label={t("auth.specialty")}>
                        {u.profile?.specialty || "—"}
                        {u.profile?.licenseNumber && (
                          <div className="audit-meta">{u.profile.licenseNumber}</div>
                        )}
                      </td>
                    )}
                    {tab === "doctor" && (
                      <td data-label={t("staff.verified")}>
                        <span className={`badge ${u.profile?.isVerified ? "green" : "amber"}`}>
                          {u.profile?.isVerified ? t("staff.verified") : t("staff.unverified")}
                        </span>
                      </td>
                    )}
                    <td data-label={t("users.twofa")}>
                      {u.twoFactorEnabled
                        ? <span className="badge purple">{t("common.enabled")}</span>
                        : <span className="badge">—</span>}
                    </td>
                    <td data-label={t("users.lastSeen")} style={{ fontSize: 12.3, color: "var(--muted)" }}>
                      {u.lastSeenAt ? fd(u.lastSeenAt) : t("common.never")}
                    </td>
                    <td>
                      <div className="row-actions">
                        {tab === "doctor" && (
                          <button
                            className={`mini-btn ${u.profile?.isVerified ? "" : "green"}`}
                            disabled={busy}
                            onClick={() =>
                              act(u.id, { isVerified: !u.profile?.isVerified },
                                u.profile?.isVerified ? t("staff.unverify") : t("staff.verify"))
                            }
                          >
                            {u.profile?.isVerified ? t("staff.unverify") : t("staff.verify")}
                          </button>
                        )}
                        {u.twoFactorEnabled && (
                          <button className="mini-btn red" disabled={busy}
                            onClick={() => act(u.id, { resetTwoFactor: true }, t("staff.reset2fa"))}>
                            {t("staff.reset2fa")}
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

        <div className="note" style={{ marginTop: 16 }}>
          <span className="note-ico"><Icon name="shieldCheck" /></span>
          <p>{tab === "doctor" ? t("staff.verifyHint") : t("staff.reset2faHint")}</p>
        </div>
      </div>
    </>
  );
}
