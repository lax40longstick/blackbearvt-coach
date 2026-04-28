import { getPublicConfig } from "./config.js";

let monitoringStarted = false;
let sentry = null;

export async function initMonitoring() {
  if (monitoringStarted || typeof window === "undefined") return;
  monitoringStarted = true;
  const cfg = getPublicConfig();
  if (!cfg.sentryDsn) return;
  try {
    sentry = await import("https://esm.sh/@sentry/browser@8.55.0");
    sentry.init({ dsn: cfg.sentryDsn, environment: cfg.environment || "production", tracesSampleRate: Number(cfg.sentryTracesSampleRate || 0.05) });
  } catch (err) { console.warn("Sentry init failed", err); }
}

export function captureAppError(error, context = {}) {
  const message = error?.message || String(error || "Unknown error");
  if (sentry?.captureException) sentry.captureException(error, { extra: context });
  console.error("Captured app error:", message, context);
}
