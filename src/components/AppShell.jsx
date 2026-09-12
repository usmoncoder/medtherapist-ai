"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, BotFace, Icon, avClass } from "./ui";
import { Logo } from "./Logo";
import { ColorIcon } from "./ColorIcon";
import { useI18n } from "@/lib/i18n";
import { post } from "@/lib/api";

function LangSwitch() {
  const { lang, setLang, langs, t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest?.(".lang-drop")) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const current = langs.find((l) => l.code === lang) || langs[0];

  return (
    <div className={`dropdown lang-drop ${open ? "open" : ""}`}>
      <button
        className="icon-btn"
        style={{ width: "auto", padding: "0 12px", fontWeight: 700, fontSize: 12.5 }}
        aria-label={t("common.language")}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {current.short}
      </button>
      <div className="dropdown-menu" style={{ minWidth: 170 }}>
        {langs.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              setLang(l.code);
              setOpen(false);
            }}
            style={l.code === lang ? { color: "var(--purple)", fontWeight: 600 } : undefined}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppShell({
  me, nav, page, onPage, title, subtitle,
  notifications = [], onNotifOpen, onReadAll,
  searchItems = [], onSearchPick, searchPlaceholder,
  children,
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [sidebar, setSidebar] = useState(false);      // mobil: panel ochiqmi
  const [collapsed, setCollapsed] = useState(false);  // kompyuter: panel yig'ilganmi
  const [drop, setDrop] = useState(null); // "notif" | "profile"
  const [dark, setDark] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let savedTheme = null;
    let savedNav = null;
    try {
      savedTheme = localStorage.getItem("mt-theme");
      savedNav = localStorage.getItem("mt-sidebar");
    } catch {}
    const isDark = savedTheme === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    setCollapsed(savedNav === "collapsed");
  }, []);

  // Kompyuterda tugma panelni yig'adi, telefonda esa ochadi/yopadi
  function toggleSidebar() {
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
    if (mobile) {
      setSidebar((v) => !v);
      return;
    }
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("mt-sidebar", next ? "collapsed" : "expanded");
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest?.(".dropdown")) setDrop(null);
      if (!e.target.closest?.(".search-wrap")) setQ("");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* Formalardagi <label> va input'ni avtomatik bog'laymiz —
     ekran o'quvchi maydon nomini to'g'ri o'qishi uchun. */
  useEffect(() => {
    let n = 0;
    const link = () => {
      for (const field of document.querySelectorAll(".field")) {
        const label = field.querySelector("label");
        const ctrl = field.querySelector("input,select,textarea");
        if (!label || !ctrl || label.htmlFor) continue;
        if (!ctrl.id) ctrl.id = `mtf-${++n}-${Math.random().toString(36).slice(2, 7)}`;
        label.htmlFor = ctrl.id;
      }
    };
    link();
    const obs = new MutationObserver(link);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("mt-theme", next ? "dark" : "light");
    } catch {}
  }

  async function logout() {
    await post("/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  const unread = notifications.filter((n) => !n.read).length;
  const results = q.trim()
    ? searchItems.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  const go = (key) => {
    onPage(key);
    setSidebar(false);
    setDrop(null);
  };

  return (
    <div>
      {/* Klaviatura bilan yuruvchilar uchun: to'g'ridan-to'g'ri mazmunga o'tish */}
      <a href="#mt-content" className="skip-link">{t("common.open")}</a>

      <aside className={`sidebar ${sidebar ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-logo"><Logo size={42} /></div>
          <div className="brand-text">
            <h1>{t("app.name")}</h1>
            <p>{t("app.tagline")}</p>
          </div>
          <button
            className="icon-btn sidebar-close"
            onClick={() => setSidebar(false)}
            aria-label={t("common.closeMenu")}
          >
            <Icon name="close" strokeWidth="2" />
          </button>
        </div>

        <nav className="nav">
          {nav.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${page === n.key ? "active" : ""}`}
              onClick={() => go(n.key)}
              title={t(n.labelKey)}
              aria-current={page === n.key ? "page" : undefined}
            >
              <ColorIcon name={n.icon} size={22} />
              <span>{t(n.labelKey)}</span>
              {n.badge > 0 && (
                <span className={`nav-badge ${n.badgePurple ? "purple" : ""}`}>{n.badge}</span>
              )}
            </button>
          ))}
          <div className="nav-divider" />
          <button className="nav-item danger" onClick={logout} title={t("nav.logout")}>
            <ColorIcon name="logout" size={22} />
            <span>{t("nav.logout")}</span>
          </button>
        </nav>

        <div className="sidebar-promo">
          <div className="promo-text">
            {t("app.promo").split("\n").map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </div>
          <div className="promo-bot"><BotFace /></div>
          <div className="promo-spark">✦</div>
        </div>
      </aside>

      <div className={`overlay ${sidebar ? "show" : ""}`} onClick={() => setSidebar(false)} />

      <div className={`main ${collapsed ? "collapsed" : ""}`}>
        <header className="topbar">
          <button
            className="icon-btn hamburger"
            onClick={toggleSidebar}
            aria-label={t("common.menu")}
            title={t("common.menu")}
            aria-expanded={!collapsed}
          >
            <ColorIcon name="menu" size={22} />
          </button>

          <div className="greeting">
            <div className="sun"><ColorIcon name="stethoscope" size={26} /></div>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="topbar-actions">
            {searchItems.length > 0 && (
              <div className="search-wrap">
                <Icon name="search" className="search-icon" strokeWidth="2" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder || t("common.search")}
                  autoComplete="off"
                  aria-label={searchPlaceholder || t("common.search")}
                />
                {q.trim() && (
                  <div className="search-results">
                    {results.length ? (
                      results.map((r) => (
                        <button
                          key={r.id}
                          className="sr-item"
                          onClick={() => {
                            onSearchPick?.(r);
                            setQ("");
                          }}
                        >
                          <Avatar name={r.label} size="sm" />
                          <span>
                            <strong>{r.label}</strong>
                            <small>{r.sub}</small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="sr-empty">{t("common.notFound")}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <LangSwitch />

            <button className="icon-btn" onClick={toggleTheme} aria-label={t("common.toggleTheme")}>
              <Icon name={dark ? "sun" : "moon"} />
            </button>

            <div className={`dropdown ${drop === "notif" ? "open" : ""}`}>
              <button
                className="icon-btn bell"
                aria-label={t("notif.title")}
                onClick={(e) => {
                  e.stopPropagation();
                  setDrop(drop === "notif" ? null : "notif");
                }}
              >
                <Icon name="bell" />
                <span className={`dot ${unread ? "" : "hidden"}`}>{unread}</span>
              </button>
              <div className="dropdown-menu notif-menu">
                <div className="dropdown-head">
                  <strong>{t("notif.title")}</strong>
                  {unread > 0 && (
                    <button
                      className="link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReadAll?.();
                      }}
                    >
                      {t("notif.readAll")}
                    </button>
                  )}
                </div>
                {notifications.length === 0 && <div className="sr-empty">{t("notif.empty")}</div>}
                {notifications.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    className={`notif-row ${n.read ? "" : "unread"}`}
                    onClick={() => {
                      onNotifOpen?.(n);
                      setDrop(null);
                    }}
                  >
                    <span className={`avatar sm av-${n.tone || "purple"}`}>!</span>
                    <span>
                      <p>{n.title}</p>
                      <small>{n.time}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`dropdown ${drop === "profile" ? "open" : ""}`}>
              <button
                className="profile-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrop(drop === "profile" ? null : "profile");
                }}
              >
                <Avatar name={me.fullName} />
                <span className="profile-meta">
                  <strong>{me.fullName}</strong>
                  <small>
                    {me.role === "doctor"
                      ? me.profile?.specialty || t("role.doctor")
                      : t(`role.${me.role}`)}
                  </small>
                </span>
                <Icon name="chevron" className="chev" strokeWidth="2" />
              </button>
              <div className="dropdown-menu">
                <div className="profile-card">
                  <span className={`avatar lg ${avClass(me.fullName)}`}>
                    {me.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong>{me.fullName}</strong>
                    <small>{me.email}</small>
                    <span className={`role-tag ${me.role}`} style={{ marginTop: 6, display: "inline-block" }}>
                      {t(`role.${me.role}`)}
                    </span>
                  </div>
                </div>
                <button onClick={() => go(nav.some((n) => n.key === "profile") ? "profile" : "security")}>
                  {t("menu.profileSettings")}
                </button>
                <button onClick={() => go("help")}>{t("menu.help")}</button>
                <button className="danger" onClick={logout}>{t("nav.logout")}</button>
              </div>
            </div>
          </div>
        </header>

        <div className="content" id="mt-content">
          <section className="page" key={page}>{children}</section>
          <footer className="footer">
            <span>© {new Date().getFullYear()} {t("app.name")} — {t("app.rights")}</span>
            <span>{t("app.version")}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
