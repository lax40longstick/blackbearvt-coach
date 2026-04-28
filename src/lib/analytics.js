import { getPublicConfig } from "./config.js";

let posthogReady = false;
let queue = [];

async function ensurePostHog() {
  const cfg = getPublicConfig();
  if (!cfg.posthogKey || posthogReady || typeof window === "undefined") return Boolean(window.posthog);
  const mod = await import("https://esm.sh/posthog-js@1.203.0");
  const posthog = mod.default || mod.posthog || window.posthog;
  posthog.init(cfg.posthogKey, {
    api_host: cfg.posthogHost || "https://us.i.posthog.com",
    capture_pageview: true,
    autocapture: false,
    loaded: () => { posthogReady = true; queue.splice(0).forEach(([n,p]) => posthog.capture(n,p)); },
  });
  window.posthog = posthog;
  return true;
}

export function initAnalytics() { ensurePostHog().catch((err) => console.warn("Analytics init failed", err)); }

export function trackEvent(name, properties = {}) {
  const event = String(name || "event").slice(0, 80);
  const payload = { ...properties, appVersion: "0.3.7", ts: new Date().toISOString() };
  if (typeof window !== "undefined" && window.posthog?.capture) return window.posthog.capture(event, payload);
  queue.push([event, payload]);
  console.info("Analytics event", event, payload);
  ensurePostHog().catch(() => {});
}

export function identifyUser(userId, traits = {}) {
  if (!userId) return;
  if (typeof window !== "undefined" && window.posthog?.identify) window.posthog.identify(userId, traits);
}

if (typeof window !== "undefined") {
  window.BearDenHQ = { ...(window.BearDenHQ || {}), trackEvent, initAnalytics, identifyUser };
}
