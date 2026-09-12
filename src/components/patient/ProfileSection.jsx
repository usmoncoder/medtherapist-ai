"use client";
import { useState } from "react";
import { Avatar, Icon, ageFrom } from "@/components/ui";
import { patch, api } from "@/lib/api";
import { getAllergyChips } from "@/lib/reference";

/* ---------------- PROFIL ---------------- */
export function ProfileSection({ me, setMe, toast, t, lang }) {
  const p = me.profile || {};
  const [form, setForm] = useState({
    fullName: me.fullName,
    birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
    gender: p.gender || "",
    phone: p.phone || "",
    address: p.address || "",
    bloodType: p.bloodType || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const age = ageFrom(form.birthDate);

  async function save() {
    setBusy(true);
    // Tibbiy maydonlar yuborilmaydi — ularni faqat shifokor tahrirlaydi
    const res = await patch("/api/auth/me", { fullName: form.fullName, profile: form });
    setBusy(false);
    if (!res.ok) return toast(t("toast.notSaved"), res.error?.detail || t(`err.${res.error.code}`), "error");
    setMe(res.data.user);
    toast(t("toast.profileSaved"));
  }

  const chips = getAllergyChips(lang);
  const label = (v) => chips.find(([value]) => value === v)?.[1] || v;

  return (
    <>
      <div className="page-head">
        <div><h2>{t("profile.title")}</h2><p>{t("profile.subtitle")}</p></div>
        <span className="badge purple">{p.cardNumber || `#${me.id.slice(-6).toUpperCase()}`}</span>
      </div>

      <div className="card">
        <div className="card-head">
          <h3><span className="head-ico purple"><Icon name="user" /></span> {t("profile.title")}</h3>
        </div>

        <div className="p-head">
          <Avatar name={me.fullName} size="lg" />
          <div>
            <h4>{me.fullName}</h4>
            <small>{me.email}{age != null ? ` · ${age} ${t("common.years")}` : ""}</small>
          </div>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label>{t("auth.fullName")}</label>
            <input value={form.fullName} onChange={set("fullName")} />
          </div>
          <div className="field">
            <label>{t("profile.birthDate")}</label>
            <input type="date" value={form.birthDate} onChange={set("birthDate")} />
          </div>
          <div className="field">
            <label>{t("profile.gender")}</label>
            <select value={form.gender} onChange={set("gender")}>
              <option value="">{t("queue.select")}</option>
              <option value="erkak">{t("profile.male")}</option>
              <option value="ayol">{t("profile.female")}</option>
            </select>
          </div>
          <div className="field">
            <label>{t("auth.phone")}</label>
            <input value={form.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" />
          </div>
          <div className="field">
            <label>{t("profile.bloodType")}</label>
            <input value={form.bloodType} onChange={set("bloodType")} placeholder="O+" />
          </div>
          <div className="field full">
            <label>{t("profile.address")}</label>
            <input value={form.address} onChange={set("address")} placeholder={t("profile.addressPlaceholder")} />
          </div>
        </div>

        <div className="form-actions">
          <button className="primary-btn" onClick={save} disabled={busy}>
            {busy ? t("common.saving") : t("common.saveChanges")}
          </button>
        </div>
      </div>

      {/* Tibbiy yozuv — faqat ko'rish uchun */}
      <div className="card">
        <div className="card-head">
          <h3><span className="head-ico green"><Icon name="shield" /></span> {t("medical.title")}</h3>
          <span className="badge">{t("medical.readOnly")}</span>
        </div>

        <div className="note" style={{ marginTop: 0, marginBottom: 16 }}>
          <span className="note-ico"><Icon name="info" /></span>
          <p>{t("medical.lockedNote")}</p>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <small>{t("profile.chronic")}</small>
            <b>{p.chronicConditions?.length ? p.chronicConditions.join(", ") : "—"}</b>
          </div>
          <div className="info-item">
            <small>{t("profile.allergies")}</small>
            <b>{p.allergies?.length ? p.allergies.map(label).join(", ") : t("common.none")}</b>
          </div>
        </div>

        <div className="sec-title">{t("profile.complaint")}</div>
        <p className="body-text">{p.complaint || t("patients.notEntered")}</p>

        <div className="sec-title">{t("profile.history")}</div>
        <p className="body-text">{p.history || t("patients.notEntered")}</p>
      </div>
    </>
  );
}
