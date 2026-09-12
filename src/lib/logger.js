// Oddiy struktura logger — prod'da JSON, dev'da o'qish uchun qulay matn
const isProd = process.env.NODE_ENV === "production";
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[process.env.LOG_LEVEL] ?? (isProd ? LEVELS.info : LEVELS.debug);

function write(level, msg, meta) {
  if (LEVELS[level] < MIN) return;
  if (isProd) {
    console[level === "debug" ? "log" : level](
      JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta })
    );
  } else {
    const tail = meta && Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    console[level === "debug" ? "log" : level](`[${level}] ${msg}${tail}`);
  }
}

export const logger = {
  debug: (m, meta) => write("debug", m, meta),
  info: (m, meta) => write("info", m, meta),
  warn: (m, meta) => write("warn", m, meta),
  error: (m, meta) => write("error", m, meta),
};
