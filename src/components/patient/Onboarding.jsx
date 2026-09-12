"use client";
import { Icon } from "@/components/ui";

/** Yangi bemor uchun 3 qadamli yo'riqnoma — hamma qadam bajarilgach yo'qoladi */
export function Onboarding({ t, profileDone, hasDoctor, hasAppointment, onGo }) {
  const steps = [
    { key: 1, done: profileDone, page: "profile" },
    { key: 2, done: hasDoctor, page: "doctor" },
    { key: 3, done: hasAppointment, page: "queue" },
  ];
  if (steps.every((s) => s.done)) return null;
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-head">
        <h3>
          <span className="head-ico purple"><Icon name="check" /></span>
          {t("onboarding.title")}
        </h3>
        <span className="badge purple">
          {steps.filter((s) => s.done).length} / {steps.length}
        </span>
      </div>

      <div className="onb">
        {steps.map((s, i) => (
          <button
            key={s.key}
            className={`onb-step ${s.done ? "done" : i === activeIdx ? "active" : ""}`}
            onClick={() => onGo(s.page)}
            disabled={s.key === 2}
            style={s.key === 2 ? { cursor: "default" } : undefined}
          >
            <span className="onb-num">{s.done ? <Icon name="check" strokeWidth="3" /> : s.key}</span>
            <span className="onb-txt">
              <strong>{t(`onboarding.step${s.key}`)}</strong>
              <small>{s.done ? t("onboarding.done") : t(`onboarding.step${s.key}Hint`)}</small>
            </span>
            {!s.done && s.key !== 2 && <Icon name="arrowRight" style={{ color: "var(--muted)" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
