"use client";
import { useRef, useState } from "react";
import { FileChip, Icon, useToast } from "./ui";
import { useI18n } from "@/lib/i18n";

/**
 * Fayl tanlash va yuklash. Yuklangan fayllar id bilan qaytadi —
 * ular xabar yoki analizga biriktiriladi.
 */
export default function FileUploader({ context, patientId, files, onChange, compact }) {
  const { t } = useI18n();
  const toast = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function upload(e) {
    const list = [...(e.target.files || [])];
    e.target.value = "";
    if (!list.length) return;
    setBusy(true);
    for (const file of list.slice(0, 5)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", context);
      if (patientId) fd.append("patientId", patientId);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast(t("toast.failed"), data?.code ? t(`err.${data.code}`) : "", "error");
          continue;
        }
        onChange([...(files || []), data.attachment]);
      } catch {
        toast(t("toast.failed"), t("err.NETWORK"), "error");
      }
    }
    setBusy(false);
  }

  return (
    <>
      <input ref={ref} type="file" hidden multiple onChange={upload}
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" />
      {compact ? (
        <button type="button" className="attach-btn" onClick={() => ref.current?.click()}
          disabled={busy} aria-label={t("file.attach")} title={t("file.attach")}>
          <Icon name="paperclip" />
        </button>
      ) : (
        <button type="button" className="secondary-btn" onClick={() => ref.current?.click()} disabled={busy}>
          <Icon name="paperclip" /> {busy ? t("file.uploading") : t("file.attach")}
        </button>
      )}
      {files?.length > 0 && (
        <div className="file-chips">
          {files.map((f) => (
            <FileChip
              key={f.id}
              file={f}
              downloadable={false}
              onRemove={() => onChange(files.filter((x) => x.id !== f.id))}
            />
          ))}
        </div>
      )}
      {!compact && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{t("file.max")}</div>}
    </>
  );
}
