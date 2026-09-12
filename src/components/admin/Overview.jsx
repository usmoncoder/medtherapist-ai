"use client";
import {
  Donut,
  Empty,
  Hero,
  Icon,
  Legend,
  Num,
} from "@/components/ui";

/* ---------------- UMUMIY KO'RINISH ---------------- */
export function Overview({ data, i18n, dxData, onGo }) {
  const { t, monthName } = i18n;
  const S = data?.stats || {};
  const months = data?.monthly || [];
  const max = Math.max(1, ...months.map((m) => m.count));

  const KPI = [
    ["users", "purple", S.patients, "admin.patients"],
    ["user", "green", S.doctors, "admin.doctors"],
    ["userCog", "amber", data ? (S.admins || 0) + (S.superadmins || 0) : undefined, "admin.admins"],
    ["clock", "red", S.unassigned, "admin.unassigned"],
    ["calendar", "blue", S.pendingAppts, "admin.pendingAppts"],
    ["clipboard", "green", S.todayAppts, "admin.todayAppts"],
    ["sparkle", "purple", S.aiReports, "admin.aiReports"],
    ["list", "blue", S.auditToday, "admin.auditToday"],
  ];

  return (
    <>
      <Hero
        title={t("hero.adminTitle")}
        subtitle={t("hero.adminSub")}
        meta={[
          { icon: "users", value: S.patients ?? 0, label: t("admin.patients").toLowerCase() },
          { icon: "user", value: S.doctors ?? 0, label: t("admin.doctors").toLowerCase() },
          { icon: "clock", value: S.unassigned ?? 0, label: t("admin.unassigned").toLowerCase() },
        ]}
        actions={
          S.unassigned > 0 && (
            <button className="primary-btn" onClick={() => onGo("assign")}>
              <Icon name="userCog" /> {t("admin.quickAssign")}
            </button>
          )
        }
      />

      <div className="kpi-grid">
        {KPI.map(([icon, tone, value, key]) => (
          <div className="kpi" key={key}>
            <span className={`kpi-ico stat-ico ${tone}`} style={{ marginBottom: 0 }}>
              <Icon name={icon} />
            </span>
            <div>
              <b>{<Num value={value} />}</b>
              <span>{t(key)}</span>
            </div>
          </div>
        ))}
      </div>

      {S.unassigned > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="note" style={{ marginTop: 0 }}>
            <span className="note-ico" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
              <Icon name="alert" />
            </span>
            <p>
              <strong>{S.unassigned}</strong> {t("admin.unassigned").toLowerCase()}.{" "}
              <button className="ghost-btn" style={{ padding: 0 }} onClick={() => onGo("assign")}>
                {t("admin.quickAssign")} →
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>{t("admin.doctorLoad")}</h3></div>
          {dxData.length === 0 ? (
            <Empty icon="users" title={t("stats.noData")} text={t("admin.noLoad")} />
          ) : (
            <div className="donut-wrap">
              <Donut
                data={dxData}
                centerNum={dxData.reduce((s, d) => s + d.value, 0)}
                centerTxt={t("stats.patientsUnit")}
              />
              <Legend data={dxData} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>{t("admin.monthly")}</h3></div>
          <div className="bars">
            {months.map((m) => (
              <div className="bar-row" key={m.month}>
                <div className="bar-top"><span>{monthName(m.month)}</span><b>{m.count}</b></div>
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
