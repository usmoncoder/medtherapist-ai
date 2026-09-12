"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import Chat from "./Chat";
import AiPanel from "./AiPanel";
import ScheduleEditor from "./ScheduleEditor";
import TwoFactorCard from "./TwoFactorCard";
import SessionsCard from "./SessionsCard";
import FileUploader from "./FileUploader";
import {
  Accordion,
  Avatar,
  BotFace,
  Donut,
  Empty,
  FileChip,
  Hero,
  Icon,
  Legend,
  Modal,
  Num,
  STATUS_COLOR,
  ageFrom,
  useToast,
} from "./ui";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/useNotifications";
import { get, post, patch, del } from "@/lib/api";
import { getAllergyChips, getDrugs, getFaq, getProtocols } from "@/lib/reference";
import { PatientsSection } from "@/components/doctor/PatientsSection";
import { AppointmentsSection } from "@/components/doctor/AppointmentsSection";
import { StatsSection } from "@/components/doctor/StatsSection";
import { DrugsSection } from "@/components/doctor/DrugsSection";
import { PatientCard } from "@/components/doctor/PatientCard";
import { DoctorProfile } from "@/components/doctor/DoctorProfile";

const NAV = [
  { key: "dashboard", labelKey: "nav.dashboard", icon: "home" },
  { key: "patients", labelKey: "nav.patients", icon: "users" },
  { key: "appointments", labelKey: "nav.appointments", icon: "calendar" },
  { key: "schedule", labelKey: "nav.schedule", icon: "clock" },
  { key: "ai", labelKey: "nav.ai", icon: "sparkle" },
  { key: "chat", labelKey: "nav.chat", icon: "chat" },
  { key: "stats", labelKey: "nav.stats", icon: "stats" },
  { key: "protocols", labelKey: "nav.protocols", icon: "book" },
  { key: "drugs", labelKey: "nav.drugs", icon: "pill" },
  { key: "profile", labelKey: "nav.doctorProfile", icon: "settings" },
  { key: "security", labelKey: "nav.security", icon: "shieldCheck" },
  { key: "help", labelKey: "nav.help", icon: "help" },
];

const COLORS = ["#6C3BFF", "#3B82F6", "#12B76A", "#F79009", "#F04438"];

export default function DoctorApp({ me: initialMe }) {
  const toast = useToast();
  const i18n = useI18n();
  const { t, fd, ft, fdt, status, lang } = i18n;
  const [me, setMe] = useState(initialMe);
  const [page, setPage] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [card, setCard] = useState(null);
  const [aiFor, setAiFor] = useState(null);
  const notif = useNotifications();

  const load = useCallback(async () => {
    const [s, p, a] = await Promise.all([
      get("/api/summary"),
      get("/api/patients"),
      get("/api/appointments"),
    ]);
    if (s.ok) setSummary(s.data.summary);
    if (p.ok) setPatients(p.data.patients || []);
    if (a.ok) setAppts(a.data.appointments || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = appts.filter((a) => a.status === "kutilmoqda");
  const today = appts.filter(
    (a) => new Date(a.startsAt).toDateString() === new Date().toDateString()
  );

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

  const openCard = useCallback(
    async (id) => {
      const res = await get(`/api/patients/${id}`);
      if (!res.ok) return toast(t("toast.failed"), t(`err.${res.error.code}`), "error");
      setCard(res.data);
    },
    [t, toast]
  );

  async function decide(id, next, doctorNote) {
    const res = await patch(`/api/appointments/${id}`, { status: next, doctorNote });
    if (!res.ok) return toast(t("toast.failed"), t(`err.${res.error.code}`), "error");
    await load();
    toast(t("toast.apptStatus", { status: status(next) }), "", next === "rad etilgan" ? "warn" : "ok");
  }

  const S = summary || {};

  const dxData = useMemo(() => {
    const counts = {};
    for (const p of patients) {
      const items = p.profile?.chronicConditions?.length
        ? p.profile.chronicConditions
        : [t("patients.diagnosing")];
      for (const c of items) counts[c] = (counts[c] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
  }, [patients, t]);

  const TITLES = {
    dashboard: [t("title.doctorDashboard"), t("sub.doctorDashboard")],
    patients: [t("nav.patients"), t("sub.patients")],
    appointments: [t("nav.appointments"), t("sub.appointments")],
    schedule: [t("schedule.title"), t("sub.schedule")],
    ai: [t("ai.title"), t("sub.ai")],
    chat: [t("nav.chat"), t("sub.chatDoctor")],
    stats: [t("stats.title"), t("sub.stats")],
    protocols: [t("protocols.title"), t("sub.protocols")],
    drugs: [t("drugs.title"), t("sub.drugs")],
    profile: [t("nav.doctorProfile"), t("sub.doctorProfile")],
    security: [t("security.title"), t("sub.security")],
    help: [t("help.title"), t("sub.help")],
  };

  return (
    <AppShell
      me={me}
      nav={NAV.map((n) => {
        if (n.key === "chat") return { ...n, badge: unreadChat, badgePurple: true };
        if (n.key === "appointments") return { ...n, badge: pending.length };
        if (n.key === "patients") return { ...n, badge: patients.length };
        return n;
      })}
      page={page}
      onPage={setPage}
      title={TITLES[page][0]}
      subtitle={TITLES[page][1]}
      notifications={notifications}
      onNotifOpen={(n) => { notif.markRead([n.id]); setPage(n.page); }}
      onReadAll={notif.markAllRead}
      searchItems={patients.map((p) => ({
        id: p.id,
        label: p.fullName,
        sub: p.profile?.chronicConditions?.join(", ") || p.email,
      }))}
      onSearchPick={(r) => openCard(r.id)}
      searchPlaceholder={t("patients.searchPlaceholder")}
    >
      {page === "dashboard" && (
        <>
          <Hero
            title={t("hero.doctorTitle")}
            subtitle={t("hero.doctorSub")}
            meta={[
              { icon: "calendar", value: today.length, label: t("stat.todayAppts").toLowerCase() },
              { icon: "clock", value: pending.length, label: t("stat.awaitingApproval").toLowerCase() },
              { icon: "users", value: S.patients ?? 0, label: t("nav.patients").toLowerCase() },
            ]}
            actions={
              <button className="primary-btn" onClick={() => setPage("ai")}>
                <Icon name="sparkle" /> {t("ai.newAnalysis")}
              </button>
            }
          />

          <div className="stats-grid five">
            <button className="stat-card" onClick={() => setPage("patients")}>
              <div className="stat-ico purple"><Icon name="user" /></div>
              <div className="stat-num">{<Num value={S.patients} />}</div>
              <div className="stat-label">{t("stat.totalPatients")}<span>{t("stat.assigned")}</span></div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("appointments")}>
              <div className="stat-ico blue"><Icon name="calendar" /></div>
              <div className="stat-num">{<Num value={S.todayCount} />}</div>
              <div className="stat-label">{t("stat.todayAppts")}<span>{t("stat.planned")}</span></div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("appointments")}>
              <div className="stat-ico amber"><Icon name="clock" /></div>
              <div className="stat-num">{pending.length}</div>
              <div className="stat-label">{t("stat.awaitingApproval")}</div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("patients")}>
              <div className="stat-ico red"><Icon name="alert" /></div>
              <div className="stat-num">{S.critical ?? 0}</div>
              <div className="stat-label">{t("analysis.critical")}</div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("chat")}>
              <div className="stat-ico green"><Icon name="chat" /></div>
              <div className="stat-num">{unreadChat}</div>
              <div className="stat-label">{t("stat.unreadMessages")}</div>
              <span className="stat-link">{t("stat.goToChat")}</span>
            </button>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h3><span className="head-ico blue"><Icon name="calendar" /></span> {t("appt.todaySchedule")}</h3>
                <button className="ghost-btn" onClick={() => setPage("appointments")}>{t("common.viewAll")}</button>
              </div>
              {today.length === 0 ? (
                <Empty icon="calendar" title={t("appt.noToday")} text={t("appt.noTodayText")} />
              ) : (
                <div className="appt-list">
                  {today.slice(0, 5).map((a) => (
                    <button className="appt-row" key={a.id} onClick={() => openCard(a.peer.id)}>
                      <span className="appt-time">{ft(a.startsAt)}</span>
                      <Avatar name={a.peer.fullName} size="sm" />
                      <span className="appt-info">
                        <strong>{a.peer.fullName}</strong>
                        <small>{a.reason}</small>
                      </span>
                      <span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="primary-btn full" onClick={() => setPage("appointments")}>
                <Icon name="calendar" /> {t("appt.manage")}
              </button>
            </div>

            <div className="card">
              <div className="card-head">
                <h3><span className="head-ico purple"><Icon name="sparkle" /></span> {t("ai.quickTitle")}</h3>
                <button className="ghost-btn outline" onClick={() => setPage("ai")}>{t("ai.newAnalysis")}</button>
              </div>
              <div className="ai-box">
                <div className="ai-bot"><BotFace size={36} /></div>
                <div className="ai-box-body">
                  <p>{t("ai.boxText")}</p>
                  <ul className="checklist">
                    <li>{t("ai.check1")}</li>
                    <li>{t("ai.check2")}</li>
                    <li>{t("ai.check3")}</li>
                    <li>{t("ai.check4")}</li>
                  </ul>
                </div>
              </div>
              <button className="primary-btn full" onClick={() => setPage("ai")}>
                <Icon name="sparkle" /> {t("ai.run")}
              </button>
              <div className="note">
                <span className="note-ico"><Icon name="shield" /></span>
                <p>{t("ai.disclaimerShort")}</p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h3><span className="head-ico green"><Icon name="users" /></span> {t("patients.recent")}</h3>
                <button className="ghost-btn" onClick={() => setPage("patients")}>{t("common.viewAll")}</button>
              </div>
              {patients.length === 0 ? (
                <Empty icon="users" title={t("patients.noneTitle")} text={t("patients.noneText")} />
              ) : (
                <div className="recent-list">
                  {patients.slice(0, 4).map((p) => (
                    <button className="recent-row" key={p.id} onClick={() => openCard(p.id)}>
                      <Avatar name={p.fullName} size="sm" />
                      <span className="r-info">
                        <strong>{p.fullName}</strong>
                        <small>
                          {ageFrom(p.profile?.birthDate) != null
                            ? `${ageFrom(p.profile.birthDate)} ${t("common.years")}`
                            : p.email}
                        </small>
                      </span>
                      <span className="recent-meta">
                        <small>{p.lastAppointment ? fd(p.lastAppointment.at) : "—"}</small>
                        <b>{p.profile?.chronicConditions?.[0] || t("patients.diagnosing")}</b>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head"><h3>{t("stats.dxSplit")}</h3></div>
              {dxData.length === 0 ? (
                <Empty icon="stats" title={t("stats.noData")} text={t("stats.noDataText")} />
              ) : (
                <div className="donut-wrap">
                  <Donut data={dxData} centerNum={patients.length} centerTxt={t("stats.patientsUnit")} />
                  <Legend data={dxData} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {page === "patients" && <PatientsSection patients={patients} onOpen={openCard} i18n={i18n} />}

      {page === "appointments" && (
        <AppointmentsSection appts={appts} onDecide={decide} onOpen={openCard} i18n={i18n} />
      )}

      {page === "schedule" && <ScheduleEditor />}

      {page === "ai" && (
        <AiPanel patients={patients} toast={toast} preselect={aiFor} onUsed={() => setAiFor(null)} />
      )}

      {page === "chat" && <Chat me={me} onUnreadChange={setUnreadChat} />}

      {page === "stats" && <StatsSection patients={patients} appts={appts} dxData={dxData} i18n={i18n} />}

      {page === "protocols" && (
        <>
          <div className="page-head">
            <div>
              <h2>{t("protocols.title")}</h2>
              <p>{t("protocols.count", { n: getProtocols(lang).length })}</p>
            </div>
          </div>
          <div className="card"><Accordion items={getProtocols(lang)} /></div>
        </>
      )}

      {page === "drugs" && <DrugsSection i18n={i18n} />}

      {page === "profile" && <DoctorProfile me={me} setMe={setMe} toast={toast} t={t} />}

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

      <PatientCard
        data={card}
        i18n={i18n}
        toast={toast}
        onClose={() => setCard(null)}
        onReload={() => card && openCard(card.patient.id)}
        onAi={(id) => { setCard(null); setAiFor(id); setPage("ai"); }}
      />
    </AppShell>
  );
}
