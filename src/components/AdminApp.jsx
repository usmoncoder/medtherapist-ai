"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import TwoFactorCard from "./TwoFactorCard";
import SessionsCard from "./SessionsCard";
import {
  Accordion, Avatar, Donut, Empty, Hero, Icon, Legend, Modal, Pager,
  STATUS_COLOR, ageFrom, useToast,
} from "./ui";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/useNotifications";
import { get, post, patch } from "@/lib/api";
import { getFaq } from "@/lib/reference";
import { Overview } from "@/components/admin/Overview";
import { AssignSection } from "@/components/admin/AssignSection";
import { UsersSection } from "@/components/admin/UsersSection";
import { ApptsSection } from "@/components/admin/ApptsSection";
import { AuditSection } from "@/components/admin/AuditSection";
import { StaffSection } from "@/components/admin/StaffSection";
import { SystemSection } from "@/components/admin/SystemSection";

// Administrator — kundalik ish; bosh administrator — tizim va hodimlar ustidan nazorat
const NAV_ADMIN = [
  { key: "dashboard", labelKey: "nav.overview", icon: "home" },
  { key: "assign", labelKey: "nav.assign", icon: "assign" },
  { key: "users", labelKey: "nav.users", icon: "users" },
  { key: "appointments", labelKey: "nav.appointments", icon: "calendar" },
  { key: "audit", labelKey: "nav.audit", icon: "list" },
  { key: "security", labelKey: "nav.security", icon: "shieldCheck" },
  { key: "help", labelKey: "nav.help", icon: "help" },
];

const NAV_SUPER = [
  { key: "dashboard", labelKey: "nav.overview", icon: "home" },
  { key: "assign", labelKey: "nav.assign", icon: "assign" },
  { key: "users", labelKey: "nav.users", icon: "users" },
  { key: "staff", labelKey: "nav.staff", icon: "building" },
  { key: "appointments", labelKey: "nav.appointments", icon: "calendar" },
  { key: "audit", labelKey: "nav.audit", icon: "list" },
  { key: "system", labelKey: "nav.system", icon: "server" },
  { key: "security", labelKey: "nav.security", icon: "shieldCheck" },
  { key: "help", labelKey: "nav.help", icon: "help" },
];

const COLORS = ["#6C3BFF", "#3B82F6", "#12B76A", "#F79009", "#F04438", "#A855F7"];

export default function AdminApp({ me: initialMe }) {
  const toast = useToast();
  const i18n = useI18n();
  const { t, fd, ft, fdt, status, lang, monthName } = i18n;
  const [me, setMe] = useState(initialMe);
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(null);
  const [users, setUsers] = useState(null);
  const [appts, setAppts] = useState([]);
  const notif = useNotifications();
  const isSuper = me.role === "superadmin";

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([get("/api/admin/stats"), get("/api/appointments")]);
    if (s.ok) setData(s.data);
    if (a.ok) setAppts(a.data.appointments || []);
  }, []);

  const loadUsers = useCallback(async (params = {}) => {
    const q = new URLSearchParams({
      role: params.role || "all",
      q: params.q || "",
      page: String(params.page || 1),
    });
    const res = await get(`/api/admin/users?${q}`);
    if (res.ok) setUsers(res.data);
    return res;
  }, []);

  useEffect(() => {
    load();
    loadUsers();
  }, [load, loadUsers]);

  const notifications = useMemo(
    () =>
      notif.items.map((n) => ({
        ...n,
        title: t(n.titleKey, {
          ...n.vars,
          ...(n.vars?.status ? { status: status(n.vars.status) } : {}),
        }),
        time: fdt(n.createdAt),
      })),
    [notif.items, t, status, fdt]
  );

  const S = data?.stats || {};
  const TITLES = {
    dashboard: [t("title.adminDashboard"), t("sub.adminDashboard")],
    assign: [t("assign.title"), t("sub.assign")],
    users: [t("users.title"), t("sub.users")],
    appointments: [t("appt.title"), t("sub.appointments")],
    staff: [t("nav.staff"), t("sub.staff")],
    audit: [t("audit.title"), t("sub.audit")],
    system: [t("nav.system"), t("sub.system")],
    security: [t("security.title"), t("sub.security")],
    help: [t("help.title"), t("sub.help")],
  };

  const dxData = (data?.doctorLoad || []).map((d, i) => ({
    label: d.name,
    value: d.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <AppShell
      me={me}
      nav={(isSuper ? NAV_SUPER : NAV_ADMIN).map((n) => {
        if (n.key === "assign") return { ...n, badge: S.unassigned || 0, badgePurple: true };
        if (n.key === "appointments") return { ...n, badge: S.pendingAppts || 0 };
        return n;
      })}
      page={page}
      onPage={setPage}
      title={TITLES[page][0]}
      subtitle={TITLES[page][1]}
      notifications={notifications}
      onNotifOpen={(n) => { notif.markRead([n.id]); setPage(n.page === "patients" ? "users" : n.page); }}
      onReadAll={notif.markAllRead}
      searchItems={(users?.users || []).map((u) => ({ id: u.id, label: u.fullName, sub: u.email }))}
      onSearchPick={() => setPage("users")}
      searchPlaceholder={t("users.search")}
    >
      {page === "dashboard" && (
        <Overview data={data} i18n={i18n} dxData={dxData} onGo={setPage} />
      )}

      {page === "assign" && (
        <AssignSection users={users} onReload={() => { loadUsers(); load(); }} toast={toast} i18n={i18n} />
      )}

      {page === "users" && (
        <UsersSection
          data={users}
          onQuery={loadUsers}
          onReload={() => { loadUsers(); load(); }}
          me={me}
          toast={toast}
          i18n={i18n}
        />
      )}

      {page === "staff" && isSuper && (
        <StaffSection users={users} onQuery={loadUsers} onReload={() => { loadUsers(); load(); }} toast={toast} i18n={i18n} />
      )}

      {page === "appointments" && <ApptsSection appts={appts} i18n={i18n} />}

      {page === "system" && isSuper && <SystemSection i18n={i18n} />}

      {page === "audit" && <AuditSection i18n={i18n} isSuper={isSuper} />}

      {page === "security" && (
        <>
          <div className="page-head">
            <div><h2>{t("security.title")}</h2><p>{t("sub.security")}</p></div>
          </div>
          <TwoFactorCard
            enabled={me.twoFactorEnabled}
            onChange={(v) => setMe((m) => ({ ...m, twoFactorEnabled: v }))}
          />
          <SessionsCard />
        </>
      )}

      {page === "help" && (
        <>
          <div className="page-head">
            <div><h2>{t("help.title")}</h2><p>{t("help.subtitle")}</p></div>
          </div>
          <div className="card"><Accordion items={getFaq(lang, "doctor")} /></div>
        </>
      )}
    </AppShell>
  );
}
