"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, useToast } from "./ui";
import { useI18n } from "@/lib/i18n";

const MAX_SECONDS = 180; // 3 daqiqa — uzun yozuv fayl hajmidan oshib ketmasin

// Brauzer qaysi formatni yozishini o'zi hal qiladi:
// Chrome/Edge — webm/opus, Safari (iOS) — mp4/aac.
const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const EXT = { webm: "webm", mp4: "m4a", ogg: "ogg", mpeg: "mp3" };

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Mikrofondan ovozli xabar yozadi, uni /api/uploads ga yuklaydi va
 * tayyor biriktirmani `onRecorded` orqali qaytaradi (xabar bilan birga ketadi).
 */
export default function VoiceRecorder({ onRecorded, disabled }) {
  const { t } = useI18n();
  const toast = useToast();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const tickRef = useRef(null);
  const cancelledRef = useRef(false);

  // Mikrofon har qanday holatda ham o'chirilsin — indikator yonib qolmasin
  const release = useCallback(() => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => release(), [release]);

  async function upload(blob) {
    setBusy(true);
    const sub = (blob.type.split("/")[1] || "webm").split(";")[0];
    const file = new File([blob], `ovozli-xabar-${Date.now()}.${EXT[sub] || "webm"}`, {
      type: blob.type,
    });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("context", "message");
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(t("toast.failed"), data?.code ? t(`err.${data.code}`) : "", "error");
      } else {
        onRecorded(data.attachment);
        toast(t("toast.voiceReady"), t("toast.voiceReadySub"));
      }
    } catch {
      toast(t("toast.failed"), t("err.NETWORK"), "error");
    }
    setBusy(false);
  }

  async function start() {
    if (recording || busy || disabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined")
      return toast(t("toast.micUnsupported"), "", "warn");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Ruxsat berilmadi yoki mikrofon band
      return toast(t("toast.micDenied"), t("toast.micDeniedSub"), "error");
    }

    const mimeType = CANDIDATES.find((ty) => window.MediaRecorder.isTypeSupported?.(ty));
    let rec;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      return toast(t("toast.micUnsupported"), "", "warn");
    }

    streamRef.current = stream;
    recRef.current = rec;
    chunksRef.current = [];
    cancelledRef.current = false;

    rec.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      release();
      setRecording(false);
      setSeconds(0);
      const parts = chunksRef.current;
      chunksRef.current = [];
      if (cancelledRef.current || !parts.length) return;
      upload(new Blob(parts, { type: rec.mimeType || mimeType || "audio/webm" }));
    };

    rec.start();
    setSeconds(0);
    setRecording(true);

    let elapsed = 0;
    tickRef.current = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      // Chegaraga yetganda o'zi to'xtaydi va yozilgani saqlanadi
      if (elapsed >= MAX_SECONDS) stop();
    }, 1000);
  }

  function stop() {
    clearInterval(tickRef.current);
    tickRef.current = null;
    const rec = recRef.current;
    if (rec?.state === "recording") {
      try {
        rec.stop(); // qolgani `onstop` ichida
        return;
      } catch {}
    }
    // Yozuvchi allaqachon to'xtagan yoki xato berdi — holatni o'zimiz tiklaymiz
    release();
    setRecording(false);
    setSeconds(0);
  }

  function cancel() {
    cancelledRef.current = true;
    stop();
  }

  if (recording) {
    return (
      <div className="voice-rec" role="status">
        <span className="voice-dot" aria-hidden="true" />
        <span className="voice-time">
          {t("chat.recording")} {mmss(seconds)}
        </span>
        <button type="button" className="mini-btn red" onClick={cancel} title={t("chat.voiceCancel")}>
          <Icon name="close" strokeWidth="2.4" />
        </button>
        <button type="button" className="mini-btn green" onClick={stop} title={t("chat.voiceStop")}>
          <Icon name="check" strokeWidth="2.4" /> {t("chat.voiceStop")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="attach-btn"
      onClick={start}
      disabled={busy || disabled}
      aria-label={t("chat.voiceRecord")}
      title={t("chat.voiceRecord")}
    >
      <Icon name={busy ? "clock" : "mic"} />
    </button>
  );
}
