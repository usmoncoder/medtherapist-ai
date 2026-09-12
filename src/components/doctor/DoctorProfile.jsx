"use client";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { patch, api } from "@/lib/api";

/* ---------------- SHIFOKOR PROFILI ---------------- */
export function DoctorProfile({ me, setMe, toast, t }) {
  const p = me.profile || {};
  const [form, setForm] = useState({
    fullName: me.fullName,
    specialty: p.specialty || "Terapevt",
    department: p.department || "",
    clinic: p.clinic || "",
    room: p.room || "",
    phone: p.phone || "",
    experienceYears: p.experienceYears ?? "",
    bio: p.bio || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    const res = await patch("/api/auth/me", { fullName: form.fullName, profile: form });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    setMe(res.data.user);
    toast(t("toast.profileSaved"));
  }

  return (
    <>
      <div className="page-head">
        <div><h2>{t("nav.doctorProfile")}</h2><p>{t("profile.doctorSubtitle")}</p></div>
      </div>
      <div className="card">
        <div className="p-head">
          <Avatar name={me.fullName} size="lg" />
          <div><h4>{me.fullName}</h4><small>{me.email}</small></div>
          {p.isVerified && (
            <span className="badge green" style={{ marginLeft: "auto" }}>{t("profile.verified")}</span>
          )}
        </div>
        <div className="form-grid">
          <div className="field"><label>{t("auth.fullName")}</label>
            <input value={form.fullName} onChange={set("fullName")} /></div>
          <div className="field"><label>{t("auth.specialty")}</label>
            <input value={form.specialty} onChange={set("specialty")} /></div>
          <div className="field"><label>{t("users.department")}</label>
            <input value={form.department} onChange={set("department")} placeholder="Terapiya" /></div>
          <div className="field"><label>{t("profile.clinic")}</label>
            <input value={form.clinic} onChange={set("clinic")} /></div>
          <div className="field"><label>{t("profile.room")}</label>
            <input value={form.room} onChange={set("room")} placeholder={t("profile.roomPlaceholder")} /></div>
          <div className="field"><label>{t("auth.phone")}</label>
            <input value={form.phone} onChange={set("phone")} /></div>
          <div className="field"><label>{t("profile.experience")}</label>
            <input type="number" min="0" value={form.experienceYears} onChange={set("experienceYears")} /></div>
          <div className="field full"><label>{t("profile.bio")}</label>
            <textarea value={form.bio} onChange={set("bio")} placeholder={t("profile.bioPlaceholder")} /></div>
        </div>
        <div className="form-actions">
          <button className="primary-btn" onClick={save} disabled={busy}>
            {busy ? t("common.saving") : t("common.saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}
