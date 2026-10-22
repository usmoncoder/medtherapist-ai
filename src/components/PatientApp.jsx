"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import Chat from "./Chat";
import TwoFactorCard from "./TwoFactorCard";
import SessionsCard from "./SessionsCard";
import {
  Accordion,
  Avatar,
  Empty,
  FileChip,
  Hero,
  Icon,
  Modal,
  Num,
  STATUS_COLOR,
  ageFrom,
  useToast,
} from "./ui";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/useNotifications";
import { get, post, patch } from "@/lib/api";
import { getAllergyChips, getFaq } from "@/lib/reference";
import { MyDoctor } from "@/components/patient/MyDoctor";
import { QueueSection } from "@/components/patient/QueueSection";
import { AnalysesView } from "@/components/patient/AnalysesView";
import { MedsSection } from "@/components/patient/MedsSection";
import { Onboarding } from "@/components/patient/Onboarding";
import Timeline from "./Timeline";
import { ProfileSection } from "@/components/patient/ProfileSection";

const NAV = [
  { key: "dashboard", labelKey: "nav.dashboard", icon: "home" },
  { key: "doctor", labelKey: "nav.myDoctor", icon: "user" },
  { key: "queue", labelKey: "nav.queue", icon: "calendar" },
  { key: "analyses", labelKey: "nav.analyses", icon: "flask" },
  { key: "meds", labelKey: "nav.meds", icon: "pill" },
  { key: "timeline", labelKey: "nav.timeline", icon: "clipboard" },
  { key: "chat", labelKey: "nav.chat", icon: "chat" },
  { key: "profile", labelKey: "nav.profile", icon: "settings" },
  { key: "security", labelKey: "nav.security", icon: "shieldCheck" },
  { key: "help", labelKey: "nav.help", icon: "help" },
];

export default function PatientApp({ me: initialMe }) {
  const toast = useToast();
  const i18n = useI18n();
  const { t, fd, ft, fdt, status, lang } = i18n;
  const [me, setMe] = useState(initialMe);
  const [page, setPage] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appts, setAppts] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [modal, setModal] = useState(null);
  const notif = useNotifications();

  const load = useCallback(async () => {
    const [s, d, a, an] = await Promise.all([
      get("/api/summary"),
      get("/api/doctors"),
      get("/api/appointments"),
      get("/api/analyses"),
    ]);
    if (s.ok) setSummary(s.data.summary);
    if (d.ok) setDoctors(d.data.doctors || []);
    if (a.ok) setAppts(a.data.appointments || []);
    if (an.ok) setAnalyses(an.data.analyses || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const myDoctor = doctors.find((d) => d.id === me.assignedDoctor) || null;
  const upcoming = appts
    .filter(
      (a) =>
        ["kutilmoqda", "tasdiqlangan"].includes(a.status) &&
        new Date(a.startsAt) >= new Date(Date.now() - 36e5)
    )
    .sort((x, y) => new Date(x.startsAt) - new Date(y.startsAt));

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

  async function cancelAppt(id) {
    const res = await patch(`/api/appointments/${id}`, { status: "bekor qilingan" });
    if (!res.ok) return toast(t("toast.failed"), t(`err.${res.error.code}`), "error");
    await load();
    toast(t("toast.apptCancelled"), "", "info");
  }

  const S = summary || {};
  const TITLES = {
    dashboard: [t("title.hello", { name: me.fullName.split(" ")[0] }), t("sub.patientDashboard")],
    doctor: [t("nav.myDoctor"), t("sub.myDoctor")],
    queue: [t("nav.queue"), t("sub.queue")],
    analyses: [t("nav.analyses"), t("sub.analyses")],
    meds: [t("meds.title"), t("meds.subtitle")],
    timeline: [t("timeline.title"), t("sub.timeline")],
    chat: [t("nav.chat"), t("sub.chatPatient")],
    profile: [t("nav.profile"), t("sub.profile")],
    security: [t("security.title"), t("sub.security")],
    help: [t("help.title"), t("sub.help")],
  };

  const criticalCount = analyses.filter((a) => a.flag === "kritik").length;

  return (
    <AppShell
      me={me}
      nav={NAV.map((n) =>
        n.key === "chat"
          ? { ...n, badge: unreadChat, badgePurple: true }
          : n.key === "analyses" && criticalCount
          ? { ...n, badge: criticalCount }
          : n
      )}
      page={page}
      onPage={setPage}
      title={TITLES[page][0]}
      subtitle={TITLES[page][1]}
      notifications={notifications}
      onNotifOpen={(n) => { notif.markRead([n.id]); setPage(n.page); }}
      onReadAll={notif.markAllRead}
    >
      {page === "dashboard" && (
        <>
          <Hero
            title={t("hero.patientTitle")}
            subtitle={t("hero.patientSub")}
            meta={[
              { icon: "calendar", value: S.upcoming ?? 0, label: t("stat.confirmedAppts").toLowerCase() },
              { icon: "flask", value: S.analyses ?? 0, label: t("nav.analyses").toLowerCase() },
              { icon: "clock", value: t("hero.today"), label: fd(new Date()) },
            ]}
            actions={
              myDoctor && (
                <button className="primary-btn" onClick={() => setPage("queue")}>
                  <Icon name="plus" /> {t("patient.newAppt")}
                </button>
              )
            }
          />

          <Onboarding
            t={t}
            profileDone={Boolean(me.profile?.birthDate && me.profile?.gender && me.profile?.phone)}
            hasDoctor={Boolean(me.assignedDoctor)}
            hasAppointment={appts.length > 0}
            onGo={setPage}
          />

          <div className="stats-grid">
            <button className="stat-card" onClick={() => setPage("queue")}>
              <div className="stat-ico green"><Icon name="calendar" /></div>
              <div className="stat-num">{<Num value={S.upcoming} />}</div>
              <div className="stat-label">{t("stat.confirmedAppts")}<span>{t("stat.upcoming")}</span></div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("queue")}>
              <div className="stat-ico amber"><Icon name="clock" /></div>
              <div className="stat-num">{<Num value={S.pending} />}</div>
              <div className="stat-label">{t("stat.awaitingReply")}<span>{t("stat.request")}</span></div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("analyses")}>
              <div className="stat-ico blue"><Icon name="flask" /></div>
              <div className="stat-num">{<Num value={S.analyses} />}</div>
              <div className="stat-label">{t("stat.analysesAdded")}</div>
              <span className="stat-link">{t("common.more")}</span>
            </button>
            <button className="stat-card" onClick={() => setPage("chat")}>
              <div className="stat-ico purple"><Icon name="chat" /></div>
              <div className="stat-num">{unreadChat}</div>
              <div className="stat-label">{t("stat.unreadMessages")}</div>
              <span className="stat-link">{t("stat.goToChat")}</span>
            </button>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h3><span className="head-ico purple"><Icon name="user" /></span> {t("patient.myDoctorCard")}</h3>
                {myDoctor && (
                  <button className="ghost-btn" onClick={() => setPage("doctor")}>{t("common.more")}</button>
                )}
              </div>
              {myDoctor ? (
                <>
                  <div className="p-head" style={{ paddingBottom: 14, marginBottom: 14 }}>
                    <Avatar name={myDoctor.fullName} />
                    <div>
                      <h4>{myDoctor.fullName}</h4>
                      <small>
                        {myDoctor.profile?.specialty}
                        {myDoctor.profile?.experienceYears
                          ? ` · ${myDoctor.profile.experienceYears} ${t("common.yearsExp")}`
                          : ""}
                      </small>
                    </div>
                    {myDoctor.profile?.isVerified && (
                      <span className="badge green" style={{ marginLeft: "auto" }}>{t("profile.verified")}</span>
                    )}
                  </div>
                  <button className="primary-btn full" onClick={() => setPage("chat")}>
                    <Icon name="chat" /> {t("patient.writeToDoctor")}
                  </button>
                </>
              ) : (
                <Empty icon="user" title={t("patient.waiting")} text={t("patient.assignedByAdmin")} />
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <h3><span className="head-ico blue"><Icon name="calendar" /></span> {t("patient.upcomingAppts")}</h3>
                <button className="ghost-btn" onClick={() => setPage("queue")}>{t("common.viewAll")}</button>
              </div>
              {upcoming.length === 0 ? (
                <Empty icon="calendar" title={t("patient.noApptTitle")} text={t("patient.noApptText")} />
              ) : (
                <div className="appt-list">
                  {upcoming.slice(0, 5).map((a) => (
                    <div className="appt-row" key={a.id}>
                      <span className="appt-time">{ft(a.startsAt)}</span>
                      <span className="appt-info">
                        <strong>{a.peer.fullName}</strong>
                        <small>{fd(a.startsAt)} · {a.reason}</small>
                      </span>
                      <span className={`badge ${STATUS_COLOR[a.status]}`}>{status(a.status)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="primary-btn full" onClick={() => setPage("queue")} disabled={!myDoctor}>
                <Icon name="plus" /> {t("patient.newAppt")}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3><span className="head-ico green"><Icon name="flask" /></span> {t("patient.recentAnalyses")}</h3>
              <button className="ghost-btn" onClick={() => setPage("analyses")}>{t("common.viewAll")}</button>
            </div>
            {analyses.length === 0 ? (
              <Empty icon="flask" title={t("patient.noAnalysisTitle")} text={t("analysis.doctorOnly")} />
            ) : (
              <div className="recent-list">
                {analyses.slice(0, 4).map((a) => (
                  <button className="recent-row" key={a.id} onClick={() => setModal(a)}>
                    <span className="head-ico blue"><Icon name="flask" /></span>
                    <span className="r-info">
                      <strong>{a.name}</strong>
                      <small>
                        {a.doctorComment
                          ? `${t("patient.doctorComment")}: ${a.doctorComment}`
                          : t("patient.awaitingComment")}
                      </small>
                    </span>
                    <span className="recent-meta">
                      <small>{fd(a.takenAt)}</small>
                      <b>{a.value} {a.unit}</b>
                      <span className={`flag ${a.flag}`}>{t(`flag.${a.flag}`)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {page === "doctor" && <MyDoctor doctor={myDoctor} i18n={i18n} onChat={() => setPage("chat")} />}

      {page === "queue" && (
        <QueueSection
          appts={appts}
          myDoctor={myDoctor}
          onDone={load}
          onCancel={cancelAppt}
          toast={toast}
          i18n={i18n}
        />
      )}

      {page === "analyses" && <AnalysesView list={analyses} onOpen={setModal} i18n={i18n} />}

      {page === "meds" && <MedsSection i18n={i18n} />}

      {page === "timeline" && (
        <>
          <div className="page-head">
            <div><h2>{t("timeline.title")}</h2><p>{t("sub.timeline")}</p></div>
            <button className="secondary-btn" onClick={() => window.print()}>
              <Icon name="download" /> {t("common.print")}
            </button>
          </div>
          <div className="card"><Timeline /></div>
        </>
      )}

      {page === "chat" && <Chat me={me} onUnreadChange={setUnreadChat} />}

      {page === "profile" && <ProfileSection me={me} setMe={setMe} toast={toast} t={t} lang={lang} />}

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
          <div className="card"><Accordion items={getFaq(lang, "patient")} /></div>
        </>
      )}

      <Modal
        open={Boolean(modal)}
        title={modal?.name || ""}
        onClose={() => setModal(null)}
        foot={<button className="secondary-btn" onClick={() => setModal(null)}>{t("common.close")}</button>}
      >
        {modal && (
          <>
            <div className="info-grid">
              <div className="info-item">
                <small>{t("analysis.value")}</small><b>{modal.value} {modal.unit}</b>
              </div>
              <div className="info-item">
                <small>{t("analysis.ref")}</small><b>{modal.refRange || "—"}</b>
              </div>
              <div className="info-item">
                <small>{t("analysis.takenAt")}</small><b>{fd(modal.takenAt)}</b>
              </div>
              <div className="info-item">
                <small>{t("analysis.flag")}</small>
                <b><span className={`flag ${modal.flag}`}>{t(`flag.${modal.flag}`)}</span></b>
              </div>
            </div>
            <div className="sec-title">{t("patient.doctorComment")}</div>
            <p className="body-text">{modal.doctorComment || t("analysis.noComment")}</p>
            {modal.attachments?.length > 0 && (
              <>
                <div className="sec-title">{t("file.attach")}</div>
                <div className="file-chips">
                  {modal.attachments.map((f) => <FileChip key={f.id} file={f} />)}
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </AppShell>
  );
}
