"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

/* ---------------- IKONKALAR ---------------- */
const P = {
  home: <><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9V3" /><path d="M7.5 15h9" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.3 6.3 2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" /></>,
  stats: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  book: <><path d="M4 4h7v16H4zM13 4h7v16h-7z" /></>,
  pill: <><path d="m10.5 20.5 10-10a5 5 0 0 0-7-7l-10 10a5 5 0 0 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  heart: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M12 8v4M10 10h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  clipboard: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="m9 14 2 2 4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  shieldCheck: <><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 8.3-8.3M16 5l3 3M14 7l3 3" /></>,
  paperclip: <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.2-9.2a3.7 3.7 0 0 1 5.23 5.23l-9.2 9.2a1.85 1.85 0 0 1-2.62-2.62l8.5-8.48" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
  userCog: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 11-5.7" /><circle cx="18" cy="17" r="3" /><path d="M18 13v1M18 20v1M22 17h-1M15 17h-1" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  building: <><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" /></>,
};

export function Icon({ name, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {P[name] || P.info}
    </svg>
  );
}

export function BotFace({ size = 96 }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" width={size} height={size}>
      <rect x="12" y="18" width="40" height="32" rx="12" fill="currentColor" />
      <circle cx="25" cy="34" r="4.5" fill="#fff" />
      <circle cx="39" cy="34" r="4.5" fill="#fff" />
      <rect x="29" y="8" width="6" height="10" rx="3" fill="currentColor" />
      <circle cx="32" cy="7" r="4" fill="currentColor" />
    </svg>
  );
}

/* ---------------- MATNLAR ---------------- */
const AV = ["av-purple", "av-blue", "av-green", "av-amber", "av-red"];
export const initials = (n = "") =>
  n.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
export const avClass = (n = "") => AV[n.length % AV.length];

export const ageFrom = (birthDate) => {
  if (!birthDate) return null;
  const t = new Date(birthDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
};

export const STATUS_COLOR = {
  kutilmoqda: "amber",
  tasdiqlangan: "green",
  "rad etilgan": "red",
  "bekor qilingan": "",
  yakunlangan: "blue",
};

export function Avatar({ name, size = "" }) {
  return <span className={`avatar ${size} ${avClass(name)}`}>{initials(name)}</span>;
}

/* ---------------- TOAST ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

const TOAST_ICON = { ok: "check", info: "info", warn: "alert", error: "close" };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((title, sub = "", type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p, { id, title, sub, type }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type === "ok" ? "" : t.type}`}>
            <span className="toast-ico"><Icon name={TOAST_ICON[t.type] || "check"} /></span>
            <div>
              <strong>{t.title}</strong>
              {t.sub && <small>{t.sub}</small>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- MODAL ---------------- */
export function Modal({ open, title, wide, onClose, children, foot }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") return onClose?.();
      // Tab bosilganda fokus modal ichida aylanib yuradi
      if (e.key !== "Tab" || !boxRef.current) return;
      const items = boxRef.current.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={boxRef}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            <Icon name="close" strokeWidth="2" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{foot}</div>
      </div>
    </div>
  );
}

/* ---------------- DONUT ---------------- */
export function Donut({ data, centerNum, centerTxt }) {
  const gid = useId().replace(/:/g, "");
  const R = 60, C = 2 * Math.PI * R;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);
  let offset = 0;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="donut">
      <svg viewBox="0 0 150 150">
        <defs>
          {data.map((d, i) => (
            <linearGradient id={`dg-${gid}-${i}`} key={i} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={d.color} stopOpacity="1" />
              <stop offset="100%" stopColor={d.color} stopOpacity=".62" />
            </linearGradient>
          ))}
        </defs>
        {/* orqa halqa */}
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="20" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle key={d.id ?? `${d.label}-${i}`} cx="75" cy="75" r={R} fill="none"
              stroke={`url(#dg-${gid}-${i})`}
              strokeWidth="20" strokeDasharray={on ? `${len} ${C}` : `0 ${C}`}
              strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-center"><b>{centerNum}</b><span>{centerTxt}</span></div>
    </div>
  );
}

export function Legend({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="legend">
      {data.map((d, i) => (
        <div className="legend-row" key={d.id ?? `${d.label}-${i}`}>
          <span className="legend-dot" style={{ background: d.color }} />
          <span>{d.label}</span>
          <b>{Math.round((d.value / total) * 100)}% <small>({d.value})</small></b>
        </div>
      ))}
    </div>
  );
}

/* ---------------- EMPTY / ACCORDION ---------------- */
export function Empty({ title, text, icon = "search", tone = "purple" }) {
  return (
    <div className="empty">
      <div className={`e-art ${tone}`}>
        <span className="e-ring" />
        <span className="e-ring two" />
        <span className="e-ico"><Icon name={icon} strokeWidth="1.7" /></span>
      </div>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

/* Sahifa boshidagi salomlashish paneli */
export function Hero({ title, subtitle, meta, actions, tone = "brand" }) {
  return (
    <div className={`hero ${tone}`}>
      <span className="hero-blob a" />
      <span className="hero-blob b" />
      <div className="hero-body">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {meta?.length > 0 && (
          <div className="hero-meta">
            {meta.map((m) => (
              <span className="hero-chip" key={m.label}>
                {m.icon && <Icon name={m.icon} />}
                <b>{m.value}</b> {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="hero-actions">{actions}</div>}
    </div>
  );
}

export function Accordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      {items.map((it, i) => (
        <div className={`acc ${open === i ? "open" : ""}`} key={i}>
          <button className="acc-head" onClick={() => setOpen(open === i ? null : i)}>
            {it.tag && <span className="badge purple">{it.tag}</span>}
            <strong>{it.title}</strong>
            <Icon name="chevron" className="chev" strokeWidth="2" />
          </button>
          <div className="acc-body">
            <div className="acc-inner">
              {it.text}
              {it.list && <ul>{it.list.map((b, k) => <li key={k}>{b}</li>)}</ul>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- FAYL ---------------- */
export const formatBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export function FileChip({ file, onRemove, downloadable = true }) {
  const body = (
    <>
      <Icon name={file.mime?.startsWith("image/") ? "file" : "file"} />
      <strong>{file.name}</strong>
      {file.size ? <small>{formatBytes(file.size)}</small> : null}
    </>
  );
  return (
    <span className="file-chip">
      {downloadable && file.id ? (
        <a href={`/api/uploads/${file.id}`} target="_blank" rel="noreferrer"
           style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {body}
        </a>
      ) : (
        body
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label="x"><Icon name="close" strokeWidth="2.4" /></button>
      )}
    </span>
  );
}

export function Pager({ page, pages, onPage, label }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>←</button>
      <span>{label} {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>→</button>
    </div>
  );
}

/** Ma'lumot kelmaguncha "—" emas, skeleton ko'rsatadi */
export function Num({ value, width = 46 }) {
  if (value === undefined || value === null) {
    return <span className="sk-num" style={{ width }} aria-hidden="true" />;
  }
  return <>{value}</>;
}
