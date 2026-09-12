"use client";
import { useId } from "react";

/**
 * Rangli "app-icon" uslubidagi ikonkalar: yumaloq fon + to'q rangli belgi.
 * Har biri o'z rangiga ega — yon menyuda ham, kartalarda ham ishlatiladi.
 * Yorug' va tungi rejimda bir xil o'qiladi (to'yingan ranglar).
 */

const C = {
  violet: "#7C4DFF", purple: "#A855F7", blue: "#3B82F6", cyan: "#06B6D4",
  green: "#12B76A", teal: "#14B8A6", amber: "#F79009", orange: "#FB7185",
  red: "#F04438", slate: "#64748B", pink: "#EC4899", indigo: "#4F46E5",
};

/* Har bir ikonka: [asosiy rang, chizmalar] */
const ICONS = {
  // Bosh sahifa — uy
  home: [C.violet, (c) => (
    <>
      <path d="M4.2 10.4 12 4.6l7.8 5.8V19a1.4 1.4 0 0 1-1.4 1.4H5.6A1.4 1.4 0 0 1 4.2 19z" fill={c} fillOpacity=".28" />
      <path d="M3.2 11 12 4.2 20.8 11" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M9.6 20.4v-5.2h4.8v5.2" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5.6 20.4h12.8" stroke={c} strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </>
  )],
  // Bemorlar — ikki kishi
  users: [C.blue, (c) => (
    <>
      <circle cx="9" cy="8" r="3.4" fill={c} fillOpacity=".3" />
      <circle cx="9" cy="8" r="3.4" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M2.8 20.2a6.2 6.2 0 0 1 12.4 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="17.4" cy="9.4" r="2.4" fill={C.cyan} fillOpacity=".85" />
      <path d="M16 14.6a5 5 0 0 1 5.2 4.6" stroke={C.cyan} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </>
  )],
  // Bitta bemor / shifokor
  user: [C.violet, (c) => (
    <>
      <circle cx="12" cy="8" r="3.8" fill={c} fillOpacity=".3" />
      <circle cx="12" cy="8" r="3.8" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  )],
  // Biriktirish — odam + belgi
  assign: [C.teal, (c) => (
    <>
      <circle cx="9.6" cy="8" r="3.4" fill={c} fillOpacity=".3" />
      <circle cx="9.6" cy="8" r="3.4" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M3.4 20.2a6.2 6.2 0 0 1 11.2-3.7" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="17.6" cy="17.4" r="4.2" fill={C.green} />
      <path d="m15.8 17.5 1.3 1.4 2.6-2.9" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )],
  // Administratorlar — odam + shesterna
  userCog: [C.amber, (c) => (
    <>
      <circle cx="9.4" cy="8" r="3.4" fill={c} fillOpacity=".32" />
      <circle cx="9.4" cy="8" r="3.4" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M3.2 20.2a6.2 6.2 0 0 1 10.6-4.3" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="17.8" cy="17.6" r="3.4" fill={C.violet} fillOpacity=".92" />
      <circle cx="17.8" cy="17.6" r="1.3" fill="#fff" />
      <path d="M17.8 13.6v1M17.8 20.6v1M21.8 17.6h-1M14.8 17.6h-1" stroke={C.violet} strokeWidth="1.6" strokeLinecap="round" />
    </>
  )],
  // Navbat — kalendar
  calendar: [C.blue, (c) => (
    <>
      <rect x="3.2" y="5" width="17.6" height="16" rx="3.2" fill={c} fillOpacity=".22" />
      <rect x="3.2" y="5" width="17.6" height="16" rx="3.2" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M3.4 10h17.2" stroke={c} strokeWidth="1.8" />
      <path d="M8 2.8v3.6M16 2.8v3.6" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
      <rect x="7" y="12.6" width="4" height="4" rx="1.2" fill={C.red} />
      <rect x="13.4" y="12.6" width="3.6" height="4" rx="1.2" fill={c} fillOpacity=".55" />
    </>
  )],
  // Ish jadvali — soat
  clock: [C.cyan, (c) => (
    <>
      <circle cx="12" cy="12" r="8.8" fill={c} fillOpacity=".22" />
      <circle cx="12" cy="12" r="8.8" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M12 6.8V12l3.4 2.2" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="12" r="1.2" fill={C.indigo} />
    </>
  )],
  // Suhbat — ikki pufak
  chat: [C.purple, (c) => (
    <>
      <path d="M3 7.6A3.4 3.4 0 0 1 6.4 4.2h8.2a3.4 3.4 0 0 1 3.4 3.4v3.8a3.4 3.4 0 0 1-3.4 3.4H8.6L4.6 18v-3.4A3.4 3.4 0 0 1 3 11.6z" fill={c} fillOpacity=".28" />
      <path d="M3 7.6A3.4 3.4 0 0 1 6.4 4.2h8.2a3.4 3.4 0 0 1 3.4 3.4v3.8a3.4 3.4 0 0 1-3.4 3.4H8.6L4.6 18v-3.4" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <circle cx="7.6" cy="9.6" r="1.15" fill={c} />
      <circle cx="10.9" cy="9.6" r="1.15" fill={c} />
      <circle cx="14.2" cy="9.6" r="1.15" fill={c} />
      <path d="M19.8 20.6 17 18.6h-1.6a3 3 0 0 1-2.9-2.2h2.1a4.8 4.8 0 0 0 4.8-4.8v-.4a3 3 0 0 1 1.4 2.6v4.2a3 3 0 0 1-1.8 2.8z" fill={C.pink} />
    </>
  )],
  // Analizlar — kolba
  flask: [C.green, (c) => (
    <>
      <path d="M9.4 3.2v6.2L4.9 17.6A2.2 2.2 0 0 0 6.8 21h10.4a2.2 2.2 0 0 0 1.9-3.4l-4.5-8.2V3.2" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M6.4 15.4h11.2l1.5 2.2A2.2 2.2 0 0 1 17.2 21H6.8a2.2 2.2 0 0 1-1.9-3.4z" fill={C.teal} fillOpacity=".9" />
      <path d="M8.2 3.2h7.6" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="10.4" cy="18" r="1" fill="#fff" fillOpacity=".85" />
      <circle cx="13.8" cy="19" r=".8" fill="#fff" fillOpacity=".7" />
    </>
  )],
  // AI — chip
  sparkle: [C.violet, (c) => (
    <>
      <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="3.6" fill={c} fillOpacity=".26" />
      <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="3.6" stroke={c} strokeWidth="1.8" fill="none" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.6" fill={C.pink} />
      <path d="M9.4 2.6v2.8M14.6 2.6v2.8M9.4 18.6v2.8M14.6 18.6v2.8M2.6 9.4h2.8M2.6 14.6h2.8M18.6 9.4h2.8M18.6 14.6h2.8"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  )],
  // Statistika — ustunlar
  stats: [C.indigo, (c) => (
    <>
      <rect x="3.2" y="12.6" width="4.2" height="8" rx="1.6" fill={C.blue} />
      <rect x="9.9" y="8.4" width="4.2" height="12.2" rx="1.6" fill={C.violet} />
      <rect x="16.6" y="4.2" width="4.2" height="16.4" rx="1.6" fill={C.green} />
    </>
  )],
  // Protokollar — kitob
  book: [C.orange, (c) => (
    <>
      <path d="M3.4 5.2A2 2 0 0 1 5.4 3.2h5.4v17.6H5.4a2 2 0 0 1-2-2z" fill={C.blue} fillOpacity=".35" />
      <path d="M3.4 5.2A2 2 0 0 1 5.4 3.2h5.4v17.6H5.4a2 2 0 0 1-2-2z" stroke={C.blue} strokeWidth="1.7" strokeLinejoin="round" fill="none" />
      <path d="M20.6 5.2a2 2 0 0 0-2-2h-5.4v17.6h5.4a2 2 0 0 0 2-2z" fill={c} fillOpacity=".4" />
      <path d="M20.6 5.2a2 2 0 0 0-2-2h-5.4v17.6h5.4a2 2 0 0 0 2-2z" stroke={c} strokeWidth="1.7" strokeLinejoin="round" fill="none" />
    </>
  )],
  // Dorilar — ikki rangli kapsula
  pill: [C.red, (c) => (
    <g transform="rotate(-45 12 12)">
      {/* chap yarmi */}
      <path d="M5.6 8.4H12v7.2H5.6a3.6 3.6 0 0 1 0-7.2Z" fill={C.cyan} />
      {/* o'ng yarmi */}
      <path d="M12 8.4h6.4a3.6 3.6 0 0 1 0 7.2H12z" fill={c} />
      {/* umumiy kontur */}
      <rect x="2" y="8.4" width="20" height="7.2" rx="3.6" fill="none" stroke={c} strokeWidth="1.6" />
      <path d="M12 8.4v7.2" stroke="#fff" strokeWidth="1.4" strokeOpacity=".9" />
      <circle cx="7.6" cy="11" r=".85" fill="#fff" fillOpacity=".8" />
      <circle cx="16.6" cy="13" r=".85" fill="#fff" fillOpacity=".65" />
    </g>
  )],
  // Xavfsizlik — qalqon
  shieldCheck: [C.green, (c) => (
    <>
      <path d="M12 2.6 4.4 5.4v6.2c0 4.9 3.2 8.2 7.6 9.8 4.4-1.6 7.6-4.9 7.6-9.8V5.4z" fill={c} fillOpacity=".28" />
      <path d="M12 2.6 4.4 5.4v6.2c0 4.9 3.2 8.2 7.6 9.8 4.4-1.6 7.6-4.9 7.6-9.8V5.4z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="m8.6 11.8 2.4 2.4 4.4-4.6" stroke={C.teal} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )],
  // Sozlamalar — shesterna
  settings: [C.slate, (c) => (
    <>
      <path d="M12 2.6c.9 0 1.7.6 1.9 1.5l.2.9 1.3.5.8-.5c.8-.5 1.8-.3 2.4.4l.6.6c.6.6.7 1.6.2 2.3l-.5.8.5 1.3.9.2c.9.2 1.5 1 1.5 1.9v.9c0 .9-.6 1.7-1.5 1.9l-.9.2-.5 1.3.5.8c.5.7.4 1.7-.2 2.3l-.6.6c-.6.6-1.6.8-2.4.3l-.8-.5-1.3.5-.2.9c-.2.9-1 1.5-1.9 1.5h-.9c-.9 0-1.7-.6-1.9-1.5l-.2-.9-1.3-.5-.8.5c-.8.5-1.8.3-2.4-.3l-.6-.6c-.6-.6-.7-1.6-.2-2.3l.5-.8-.5-1.3-.9-.2c-.9-.2-1.5-1-1.5-1.9v-.9c0-.9.6-1.7 1.5-1.9l.9-.2.5-1.3-.5-.8c-.5-.7-.4-1.7.2-2.3l.6-.6c.6-.7 1.6-.9 2.4-.4l.8.5 1.3-.5.2-.9c.2-.9 1-1.5 1.9-1.5z"
        fill={C.violet} fillOpacity=".22" stroke={C.violet} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" fill={C.violet} />
      <circle cx="12" cy="12" r="1.3" fill="#fff" />
    </>
  )],
  // Yordam
  help: [C.blue, (c) => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={c} fillOpacity=".24" />
      <circle cx="12" cy="12" r="9.2" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M9.3 9.4a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 4" stroke={c} strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="17.2" r="1.15" fill={C.pink} />
    </>
  )],
  // Audit jurnali — ro'yxat
  list: [C.slate, (c) => (
    <>
      <rect x="3.4" y="3.6" width="17.2" height="16.8" rx="3.2" fill={c} fillOpacity=".18" />
      <rect x="3.4" y="3.6" width="17.2" height="16.8" rx="3.2" stroke={c} strokeWidth="1.7" fill="none" />
      <circle cx="7.8" cy="8.4" r="1.35" fill={C.green} />
      <circle cx="7.8" cy="12" r="1.35" fill={C.amber} />
      <circle cx="7.8" cy="15.6" r="1.35" fill={C.blue} />
      <path d="M11 8.4h6M11 12h6M11 15.6h4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </>
  )],
  // Tizim holati — server
  server: [C.indigo, (c) => (
    <>
      <rect x="3.2" y="3.6" width="17.6" height="6.6" rx="2.4" fill={c} fillOpacity=".26" />
      <rect x="3.2" y="3.6" width="17.6" height="6.6" rx="2.4" stroke={c} strokeWidth="1.7" fill="none" />
      <rect x="3.2" y="13.8" width="17.6" height="6.6" rx="2.4" fill={c} fillOpacity=".26" />
      <rect x="3.2" y="13.8" width="17.6" height="6.6" rx="2.4" stroke={c} strokeWidth="1.7" fill="none" />
      <circle cx="7.2" cy="6.9" r="1.3" fill={C.green} />
      <circle cx="7.2" cy="17.1" r="1.3" fill={C.cyan} />
      <path d="M11 6.9h6M11 17.1h6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  )],
  // Hodimlar — klinika binosi
  building: [C.amber, (c) => (
    <>
      <path d="M4.6 20.8V7.6L12 3.4l7.4 4.2v13.2z" fill={c} fillOpacity=".26" />
      <path d="M4.6 20.8V7.6L12 3.4l7.4 4.2v13.2z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M2.8 20.8h18.4" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8.6v4.4M9.8 10.8h4.4" stroke={C.red} strokeWidth="2.1" strokeLinecap="round" />
      <rect x="10.2" y="15.8" width="3.6" height="5" rx="1" fill={c} fillOpacity=".7" />
    </>
  )],
  // Tibbiy tarix — planshet
  clipboard: [C.indigo, (c) => (
    <>
      <rect x="4.2" y="4.6" width="15.6" height="16.4" rx="3.2" fill={c} fillOpacity=".22" />
      <rect x="4.2" y="4.6" width="15.6" height="16.4" rx="3.2" stroke={c} strokeWidth="1.8" fill="none" />
      <rect x="8.4" y="2.4" width="7.2" height="4.2" rx="1.6" fill={C.violet} />
      <path d="m8.4 12.4 2 2 4-4.2" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M8.4 17.4h7.2" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </>
  )],
  // Stetoskop — tibbiy belgi
  stethoscope: [C.violet, (c) => (
    <>
      <path d="M5.2 3.2v5.4a4.4 4.4 0 0 0 8.8 0V3.2" stroke={c} strokeWidth="1.9"
        strokeLinecap="round" fill="none" />
      <path d="M3.4 3.2h3.2M12.6 3.2h3.2" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.6 13v2.2a5 5 0 0 0 10 0v-1.4" stroke={C.teal} strokeWidth="1.9"
        strokeLinecap="round" fill="none" />
      <circle cx="19.6" cy="10.6" r="2.9" fill={C.teal} />
      <circle cx="19.6" cy="10.6" r="1.1" fill="#fff" />
      <circle cx="9.6" cy="13" r="1.5" fill={c} />
    </>
  )],
  // Panelni yig'ish
  menu: [C.slate, (c) => (
    <>
      <rect x="2.8" y="4.4" width="18.4" height="2.4" rx="1.2" fill={C.violet} />
      <rect x="2.8" y="10.8" width="13" height="2.4" rx="1.2" fill={C.blue} />
      <rect x="2.8" y="17.2" width="18.4" height="2.4" rx="1.2" fill={C.cyan} />
    </>
  )],
  // Chiqish
  logout: [C.red, (c) => (
    <>
      <path d="M10 3.6H6.2a2.6 2.6 0 0 0-2.6 2.6v11.6a2.6 2.6 0 0 0 2.6 2.6H10" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="m16.4 8.2 3.8 3.8-3.8 3.8" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M20.2 12H9.4" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
    </>
  )],
};

export function ColorIcon({ name, size = 24, className = "", style }) {
  const id = useId();
  const entry = ICONS[name] || ICONS.help;
  const [color, draw] = entry;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ width: size, height: size, flexShrink: 0, display: "block", ...style }}
    >
      {draw(color, id)}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(ICONS);
export default ColorIcon;
