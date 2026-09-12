"use client";
import { useState, useEffect } from "react";
import { Avatar, Empty, Icon, Modal, Pager } from "@/components/ui";
import { post, patch, api } from "@/lib/api";

/* ---------------- FOYDALANUVCHILAR ---------------- */
const EMPTY_USER = {
  fullName: "", email: "", password: "", role: "doctor", phone: "", specialty: "", department: "",
};

export function UsersSection({ data, onQuery, onReload, me, toast, i18n }) {
  const { t, fd, fdt } = i18n;
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const roles = me.role === "superadmin"
    ? ["patient", "doctor", "admin", "superadmin"]
    : ["patient", "doctor"];

  useEffect(() => {
    onQuery({ role, q, page });
  }, [role, q, page, onQuery]);

  async function create() {
    setBusy(true);
    const res = await post("/api/admin/users", form);
    setBusy(false);
    if (!res.ok) return toast(t("toast.failed"), res.error?.detail || t(`err.${res.error.code}`), "error");
    setCreating(false);
    setForm(EMPTY_USER);
    toast(t("users.created"), form.fullName);
    onReload();
  }

  async function update(id, payload, msg) {
    setBusy(true);
    const res = await patch(`/api/admin/users/${id}`, payload);
    setBusy(false);
    if (!res.ok) return toast(t("toast.failed"), res.error?.detail || t(`err.${res.error.code}`), "error");
    toast(msg || t("users.updated"));
    setEditing(null);
    onReload();
  }

  const list = data?.users || [];

  return (
    <>
      <div className="page-head">
        <div><h2>{t("users.title")}</h2><p>{t("common.total")}: {data?.total ?? "—"}</p></div>
        <button className="primary-btn" onClick={() => setCreating(true)}>
          <Icon name="plus" /> {t("users.new")}
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="field-search">
            <Icon name="search" strokeWidth="2" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={t("users.search")} aria-label={t("users.search")} />
          </div>
          <div className="tabs">
            {["all", "patient", "doctor", "admin", "superadmin"].map((r) => (
              <button key={r} className={`tab ${role === r ? "active" : ""}`}
                onClick={() => { setRole(r); setPage(1); }}>
                {r === "all" ? t("common.all") : t(`role.${r}`)}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <Empty title={t("users.empty")} text={t("patients.emptyText")} />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("common.name")}</th>
                  <th scope="col">{t("common.role")}</th>
                  <th scope="col">{t("users.status")}</th>
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
                    <td data-label={t("common.role")}>
                      <span className={`role-tag ${u.role}`}>{t(`role.${u.role}`)}</span>
                      {u.role === "doctor" && (
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                          {u.profile?.specialty} · {u.patientCount ?? 0} {t("users.patientCount").toLowerCase()}
                        </div>
                      )}
                      {u.role === "patient" && u.assignedDoctorName && (
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                          {u.assignedDoctorName}
                        </div>
                      )}
                    </td>
                    <td data-label={t("users.status")}>
                      <span className={`badge ${u.isActive ? "green" : "red"}`}>
                        {u.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </td>
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
                        <button className="mini-btn" onClick={() => setEditing(u)}>{t("common.edit")}</button>
                        {u.id !== me.id && (
                          <button
                            className={`mini-btn ${u.isActive ? "red" : "green"}`}
                            disabled={busy}
                            onClick={() => update(u.id, { isActive: !u.isActive })}
                          >
                            {u.isActive ? t("users.deactivate") : t("users.activate")}
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
        <Pager page={data?.page || 1} pages={data?.pages || 1} onPage={setPage} label={t("common.page")} />
      </div>

      {/* Yaratish */}
      <Modal
        open={creating}
        title={t("users.new")}
        onClose={() => setCreating(false)}
        foot={
          <>
            <button className="secondary-btn" onClick={() => setCreating(false)}>{t("common.cancel")}</button>
            <button className="primary-btn" onClick={create} disabled={busy}>{t("users.create")}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field full">
            <label>{t("common.role")} <span>*</span></label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>{t("auth.fullName")} <span>*</span></label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="field">
            <label>{t("common.email")} <span>*</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>{t("auth.password")} <span>*</span></label>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t("auth.passwordHint")} />
          </div>
          <div className="field">
            <label>{t("auth.phone")}</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {form.role === "doctor" && (
            <>
              <div className="field">
                <label>{t("auth.specialty")}</label>
                <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Terapevt" />
              </div>
              <div className="field full">
                <label>{t("users.department")}</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Terapiya" />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Tahrirlash */}
      <Modal
        open={Boolean(editing)}
        title={t("users.editTitle")}
        onClose={() => setEditing(null)}
        foot={<button className="secondary-btn" onClick={() => setEditing(null)}>{t("common.close")}</button>}
      >
        {editing && (
          <EditUser user={editing} me={me} onSave={update} busy={busy} i18n={i18n} />
        )}
      </Modal>
    </>
  );
}

function EditUser({ user, me, onSave, busy, i18n }) {
  const { t } = i18n;
  const [name, setName] = useState(user.fullName);
  const [role, setRole] = useState(user.role);
  const [pw, setPw] = useState("");

  return (
    <>
      <div className="p-head">
        <Avatar name={user.fullName} />
        <div>
          <h4>{user.fullName}</h4>
          <small>{user.email}</small>
        </div>
        <span className={`role-tag ${user.role}`} style={{ marginLeft: "auto" }}>{t(`role.${user.role}`)}</span>
      </div>

      <div className="form-grid">
        <div className="field full">
          <label>{t("auth.fullName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {me.role === "superadmin" && user.id !== me.id && (
          <div className="field full">
            <label>{t("users.changeRole")}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {["patient", "doctor", "admin", "superadmin"].map((r) => (
                <option key={r} value={r}>{t(`role.${r}`)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field full">
          <label>{t("users.resetPassword")}</label>
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("users.newPassword")} />
        </div>
      </div>

      <div className="form-actions">
        <button
          className="primary-btn"
          disabled={busy}
          onClick={() =>
            onSave(user.id, {
              fullName: name,
              ...(role !== user.role ? { role } : {}),
              ...(pw ? { password: pw } : {}),
            })
          }
        >
          {t("common.saveChanges")}
        </button>
      </div>
    </>
  );
}
