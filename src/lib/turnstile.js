import { getPublicConfig } from "./config.js";

let scriptPromise = null;
function loadScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true;
    s.onload = () => resolve(true); s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function renderTurnstile(form) {
  const cfg = getPublicConfig();
  if (!cfg.turnstileSiteKey || !form) return null;
  await loadScript();
  let mount = form.querySelector("[data-turnstile]");
  if (!mount) { mount = document.createElement("div"); mount.dataset.turnstile = ""; mount.style.margin = "10px 0"; form.querySelector("button[type=submit]")?.before(mount); }
  window.turnstile.render(mount, { sitekey: cfg.turnstileSiteKey, callback: (token) => { form.dataset.turnstileToken = token; } });
  return mount;
}

export function getTurnstileToken(form) { return form?.dataset?.turnstileToken || undefined; }
