"use client";

/**
 * MEDAI belgisi — doiraviy kadusey logotipi (public/logo.png).
 */
export function Logo({ size = 42 }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      /* global svg{width:20px} qoidasiga tushmasligi uchun aniq o'lcham */
      style={{ width: size, height: size, flexShrink: 0, display: "block", objectFit: "contain" }}
    />
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
