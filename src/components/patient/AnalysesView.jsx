"use client";
import { Empty, Icon } from "@/components/ui";

/* ---------------- ANALIZLAR (faqat ko'rish) ---------------- */
export function AnalysesView({ list, onOpen, i18n }) {
  const { t, fd } = i18n;
  return (
    <>
      <div className="page-head">
        <div><h2>{t("analysis.title")}</h2><p>{t("analysis.doctorOnly")}</p></div>
        <span className="badge">{list.length} {t("common.count")}</span>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <Empty icon="flask" title={t("analysis.emptyTitle")} text={t("analysis.doctorOnly")} />
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  <th scope="col">{t("analysis.name")}</th>
                  <th scope="col">{t("analysis.value")}</th>
                  <th scope="col">{t("analysis.ref")}</th>
                  <th scope="col">{t("analysis.flag")}</th>
                  <th scope="col">{t("common.date")}</th>
                  <th scope="col">{t("patient.doctorComment")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => onOpen(a)}>
                    <td>
                      <strong>{a.name}</strong>
                      {a.attachments?.length > 0 && (
                        <Icon name="paperclip" style={{ width: 13, height: 13, marginLeft: 6, color: "var(--muted)" }} />
                      )}
                    </td>
                    <td data-label={t("analysis.value")}>{a.value} {a.unit}</td>
                    <td data-label={t("analysis.ref")}>{a.refRange || "—"}</td>
                    <td data-label={t("analysis.flag")}>
                      <span className={`flag ${a.flag}`}>{t(`flag.${a.flag}`)}</span>
                    </td>
                    <td data-label={t("common.date")}>{fd(a.takenAt)}</td>
                    <td data-label={t("patient.doctorComment")}>
                      {a.doctorComment
                        ? <span className="badge green">{t("analysis.hasComment")}</span>
                        : <span className="badge">{t("analysis.pending")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
