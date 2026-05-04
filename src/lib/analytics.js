import { getPublicConfig } from "./config.js";

const OFFLINE_QUEUE_KEY = "benchboss_analytics_offline_queue_v1";

let posthogReady = false;
let queue = [];

function readOfflineQueue() {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(items) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-250)));
  } catch {}
}

function enqueueOfflineEvent(name, properties = {}) {
  const item = {
    name: String(name || "event").slice(0, 80),
    properties: { ...properties, queuedAt: new Date().toISOString() },
  };
  writeOfflineQueue([...readOfflineQueue(), item]);
  return item;
}

function flushOfflineQueue() {
  if (typeof window === "undefined" || !window.posthog?.capture) return;
  const items = readOfflineQueue();
  if (!items.length) return;
  writeOfflineQueue([]);
  items.forEach((item) => {
    try {
      window.posthog.capture(item.name, {
        ...(item.properties || {}),
        flushedAt: new Date().toISOString(),
        offlineQueued: true,
      });
    } catch {
      enqueueOfflineEvent(item.name, item.properties || {});
    }
  });
}

async function ensurePostHog() {
  const cfg = getPublicConfig();
  if (!cfg.posthogKey || posthogReady || typeof window === "undefined") return Boolean(window?.posthog);
  const mod = await import("https://esm.sh/posthog-js@1.203.0");
  const posthog = mod.default || mod.posthog || window.posthog;
  posthog.init(cfg.posthogKey, {
    api_host: cfg.posthogHost || "https://us.i.posthog.com",
    capture_pageview: true,
    autocapture: false,
    loaded: () => {
      posthogReady = true;
      queue.splice(0).forEach(([n, p]) => posthog.capture(n, p));
      flushOfflineQueue();
    },
  });
  window.posthog = posthog;
  flushOfflineQueue();
  return true;
}

export function initAnalytics() { ensurePostHog().catch((err) => console.warn("Analytics init failed", err)); }

export function trackEvent(name, properties = {}) {
  const event = String(name || "event").slice(0, 80);
  const payload = { ...properties, appVersion: "0.11.0", ts: new Date().toISOString() };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    console.info("Analytics event queued offline", event, payload);
    return enqueueOfflineEvent(event, payload);
  }
  if (typeof window !== "undefined" && window.posthog?.capture) {
    const result = window.posthog.capture(event, payload);
    flushOfflineQueue();
    return result;
  }
  queue.push([event, payload]);
  console.info("Analytics event", event, payload);
  ensurePostHog().catch(() => {});
}

export function identifyUser(userId, traits = {}) {
  if (!userId) return;
  if (typeof window !== "undefined" && window.posthog?.identify) window.posthog.identify(userId, traits);
}

export function trackOfflineEvent(name, properties = {}) {
  return enqueueOfflineEvent(name, { ...properties, source: properties.source || "offline" });
}

if (typeof window !== "undefined") {
  window.BearDenHQ = {
    ...(window.BearDenHQ || {}),
    trackEvent,
    trackOfflineEvent,
    initAnalytics,
    identifyUser,
    flushAnalyticsQueue: flushOfflineQueue,
  };
}
