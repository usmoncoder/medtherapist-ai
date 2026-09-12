"use client";
import { Component } from "react";

/**
 * Butun ilovani o'rab turadi: React xatosi butun ekranni "oq" qilib qo'ymasin,
 * xato esa serverga yuborilsin (bosh administrator ko'radi).
 */
function report(message, stack) {
  try {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(message).slice(0, 500),
        stack: String(stack || "").slice(0, 4000),
        page: typeof location !== "undefined" ? location.pathname : "",
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

if (typeof window !== "undefined" && !window.__mtErrorHook) {
  window.__mtErrorHook = true;
  window.addEventListener("error", (e) => report(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) =>
    report(e.reason?.message || "unhandledrejection", e.reason?.stack)
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    report(error?.message || "render error", `${error?.stack || ""}\n${info?.componentStack || ""}`);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-box">
          <div className="crash-ico">⚠️</div>
          <h2>{this.props.title}</h2>
          <p>{this.props.text}</p>
          <button className="primary-btn" onClick={() => location.reload()}>
            {this.props.retry}
          </button>
        </div>
      </div>
    );
  }
}
