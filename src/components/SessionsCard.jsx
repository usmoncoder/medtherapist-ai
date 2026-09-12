"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";

/** "Barcha qurilmalardan chiqish" — parol o'g'irlangan bo'lsa birinchi qadam */
export default function SessionsCard() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logoutAll() {
    setBusy(true);
    const res = await post("/api/auth/logout-all");
    setBusy(false);
    if (!res.ok) return toast(t("toast.failed"), "", "error");
    toast(t("security.logoutAllDone"));
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>
          <span className="head-ico amber"><Icon name="key" /></span>
          {t("security.sessions")}
        </h3>
      </div>
      <p className="body-text" style={{ marginBottom: 16 }}>{t("security.logoutAllHint")}</p>
      <button className="danger-btn" onClick={logoutAll} disabled={busy}>
        <Icon name="logout" /> {t("security.logoutAll")}
      </button>
    </div>
  );
}
