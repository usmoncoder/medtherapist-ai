"use client";
import { useState } from "react";
import { Empty, Icon, Modal } from "@/components/ui";
import { getDrugs } from "@/lib/reference";

/* ---------------- DORILAR ---------------- */
export function DrugsSection({ i18n }) {
  const { t, lang } = i18n;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const all = getDrugs(lang);
  const list = all.filter((d) => (d.n + d.g + d.i).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div><h2>{t("drugs.title")}</h2><p>{t("drugs.subtitle")}</p></div>
      </div>
      <div className="toolbar">
        <div className="field-search">
          <Icon name="search" strokeWidth="2" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("drugs.searchPlaceholder")} aria-label={t("drugs.searchPlaceholder")} />
        </div>
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty title={t("drugs.emptyTitle")} text={t("drugs.emptyText")} /></div>
      ) : (
        <div className="mini-grid">
          {list.map((d) => (
            <button className="mini-card" key={d.n} onClick={() => setOpen(d)}>
              <h4>{d.n}</h4>
              <p>{d.g}</p>
              <span className="badge purple">{d.d}</span>
            </button>
          ))}
        </div>
      )}
      <Modal open={Boolean(open)} title={open?.n || ""} onClose={() => setOpen(null)}
        foot={<button className="secondary-btn" onClick={() => setOpen(null)}>{t("common.close")}</button>}>
        {open && (
          <>
            <div className="info-grid">
              <div className="info-item"><small>{t("drugs.group")}</small><b>{open.g}</b></div>
              <div className="info-item"><small>{t("drugs.dose")}</small><b>{open.d}</b></div>
            </div>
            <div className="sec-title">{t("drugs.indications")}</div>
            <p className="body-text">{open.i}</p>
            <div className="sec-title">{t("drugs.sideEffects")}</div>
            <p className="body-text">{open.s}</p>
            <div className="sec-title">{t("drugs.contra")}</div>
            <p className="body-text">{open.c}</p>
            <div className="disclaimer"><p>{t("drugs.disclaimer")}</p></div>
          </>
        )}
      </Modal>
    </>
  );
}
