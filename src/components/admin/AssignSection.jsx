"use client";
import { useState } from "react";
import { Avatar, Empty, Icon } from "@/components/ui";
import { post, api } from "@/lib/api";

/* ---------------- BIRIKTIRISH ---------------- */
export function AssignSection({ users, onReload, toast, i18n }) {
  const { t } = i18n;
  const [selected, setSelected] = useState(null);
  const [doctorId, setDoctorId] = useState("");
  const [busy, setBusy] = useState(false);

  const patients = (users?.users || []).filter((u) => u.role === "patient");
  const unassigned = patients.filter((p) => !p.assignedDoctor);
  const assigned = patients.filter((p) => p.assignedDoctor);
  const doctors = users?.doctors || [];

  async function assign(patientId, docId) {
    setBusy(true);
    const res = await post("/api/admin/assign", { patientId, doctorId: docId });
    setBusy(false);
    if (!res.ok) return toast(t("toast.failed"), t(`err.${res.error.code}`), "error");
    toast(docId ? t("assign.done") : t("assign.removed"), res.data.doctorName || "");
    setSelected(null);
    setDoctorId("");
    onReload();
  }

  return (
    <>
      <div className="page-head">
        <div><h2>{t("assign.title")}</h2><p>{t("sub.assign")}</p></div>
        <span className="badge amber">{unassigned.length} {t("common.count")}</span>
      </div>

      <div className="assign-grid">
        <div>
          <div className="card">
            <div className="card-head">
              <h3>
                <span className="head-ico amber"><Icon name="clock" /></span>
                {t("assign.unassignedList")}
              </h3>
            </div>
            {unassigned.length === 0 ? (
              <Empty icon="check" title={t("assign.none")} text="" />
            ) : (
              <div className="recent-list">
                {unassigned.map((p) => (
                  <div className="recent-row" key={p.id}>
                    <Avatar name={p.fullName} size="sm" />
                    <span className="r-info">
                      <strong>{p.fullName}</strong>
                      <small>{p.profile?.phone || p.email}</small>
                    </span>
                    <button
                      className={`mini-btn ${selected === p.id ? "green" : ""}`}
                      onClick={() => setSelected(selected === p.id ? null : p.id)}
                    >
                      {selected === p.id ? t("assign.chooseDoctor") : t("assign.assign")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>
                <span className="head-ico green"><Icon name="users" /></span>
                {t("assign.assignedList")}
              </h3>
              <span className="badge">{assigned.length}</span>
            </div>
            {assigned.length === 0 ? (
              <Empty icon="users" title={t("patients.noneTitle")} text="" />
            ) : (
              <div className="table-wrap">
                <table className="cards">
                  <thead>
                    <tr>
                      <th scope="col">{t("appt.patient")}</th>
                      <th scope="col">{t("assign.currentDoctor")}</th>
                      <th scope="col" style={{ textAlign: "right" }}>{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assigned.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="cell-user">
                            <Avatar name={p.fullName} size="sm" />
                            <div>
                              <strong>{p.fullName}</strong>
                              <small>{p.email}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label={t("assign.currentDoctor")}>{p.assignedDoctorName || "—"}</td>
                        <td>
                          <div className="row-actions">
                            <button className="mini-btn" onClick={() => setSelected(p.id)}>
                              {t("assign.reassign")}
                            </button>
                            <button className="mini-btn red" onClick={() => assign(p.id, null)} disabled={busy}>
                              {t("assign.unassign")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>
              <span className="head-ico purple"><Icon name="user" /></span>
              {t("assign.chooseDoctor")}
            </h3>
          </div>
          {!selected && (
            <p className="body-text" style={{ marginBottom: 12 }}>{t("assign.chooseDoctor")} →</p>
          )}
          <div className="doctor-pick">
            {doctors.map((d) => (
              <button
                key={d.id}
                className={`doctor-pick-item ${doctorId === d.id ? "on" : ""}`}
                onClick={() => setDoctorId(d.id)}
                disabled={!selected}
                style={!selected ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
              >
                <Avatar name={d.fullName} size="sm" />
                <span className="d-info">
                  <strong>{d.fullName}</strong>
                  <small>{d.specialty}{d.department ? ` · ${d.department}` : ""}</small>
                </span>
                <span className="load-pill">{d.patientCount} {t("assign.load")}</span>
              </button>
            ))}
          </div>
          <button
            className="primary-btn full"
            disabled={!selected || !doctorId || busy}
            onClick={() => assign(selected, doctorId)}
          >
            <Icon name="check" /> {t("assign.assign")}
          </button>
        </div>
      </div>
    </>
  );
}
