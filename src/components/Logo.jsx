"use client";
import { useId } from "react";

/**
 * MedTherapist AI belgisi — binafsha gradient "squircle" ustida
 * yurak + puls chizig'i. Har bir nusxa uchun gradient id noyob.
 */
export function Logo({ size = 42, radius = 13 }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      /* global svg{width:20px} qoidasidan ustun bo'lishi uchun inline o'lcham */
      style={{ width: size, height: size, flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C4DFF" />
          <stop offset="45%" stopColor="#6C3BFF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id={`sh-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".35" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx={radius} fill={`url(#lg-${id})`} />
      <rect width="48" height="24" rx={radius} fill={`url(#sh-${id})`} />
      <path
        d="M24 37.5c-.5 0-1-.18-1.4-.53C16.2 31.6 12 27.6 12 22.3c0-4.3 3.2-7.6 7.3-7.6 2.3 0 4.4 1.05 5.7 2.75 1.3-1.7 3.4-2.75 5.7-2.75 4.1 0 7.3 3.3 7.3 7.6 0 5.3-4.2 9.3-10.6 14.67-.4.35-.9.53-1.4.53Z"
        fill="#fff"
        fillOpacity=".95"
      />
      <path
        d="M13.5 24.6h5.2l2.1-4.2 3.4 8.1 2.6-5.3 1.7 3h5.9"
        stroke="#6C3BFF"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Yon panel va kirish sahifasi uchun logo + nom */
export function Wordmark({ title, subtitle, size = 42, light = false }) {
  return (
    <>
      <Logo size={size} />
      <div className="brand-text">
        <h1 style={light ? { color: "#fff" } : undefined}>{title}</h1>
        <p style={light ? { color: "rgba(255,255,255,.8)" } : undefined}>{subtitle}</p>
      </div>
    </>
  );
}

export default Logo;
