"use client";
import { Avatar, Empty, Icon } from "@/components/ui";

/* ---------------- MENING SHIFOKORIM ---------------- */
export function MyDoctor({ doctor, i18n, onChat }) {
  const { t } = i18n;
  if (!doctor) {
    return (
      <>
        <div className="page-head">
          <div><h2>{t("nav.myDoctor")}</h2><p>{t("sub.myDoctor")}</p></div>
        </div>
        <div className="card">
          <Empty icon="user" title={t("patient.waiting")} text={t("patient.assignedByAdmin")} />
        </div>
      </>
    );
  }
  const p = doctor.profile || {};
  return (
    <>
      <div className="page-head">
        <div><h2>{t("nav.myDoctor")}</h2><p>{t("patient.myDoctorInfo")}</p></div>
        {p.isVerified && <span className="badge green">{t("profile.verified")}</span>}
      </div>
      <div className="card">
        <div className="p-head">
          <Avatar name={doctor.fullName} size="lg" />
          <div>
            <h4>{doctor.fullName}</h4>
            <small>{p.specialty}{p.department ? ` · ${p.department}` : ""}</small>
          </div>
        </div>
        <div className="info-grid">
          <div className="info-item"><small>{t("profile.clinic")}</small><b>{p.clinic || "—"}</b></div>
          <div className="info-item"><small>{t("profile.room")}</small><b>{p.room || "—"}</b></div>
          <div className="info-item">
            <small>{t("profile.experience")}</small>
            <b>{p.experienceYears ? `${p.experienceYears} ${t("common.yearsExp")}` : "—"}</b>
          </div>
          <div className="info-item">
            <small>{t("nav.schedule")}</small>
            <b>{doctor.hasSchedule ? t("common.enabled") : t("slots.scheduleMissing")}</b>
          </div>
        </div>
        {p.bio && (<><div className="sec-title">{t("profile.bio")}</div><p className="body-text">{p.bio}</p></>)}
        <button className="primary-btn full" onClick={onChat}>
          <Icon name="chat" /> {t("patient.writeToDoctor")}
        </button>
      </div>
    </>
  );
}
