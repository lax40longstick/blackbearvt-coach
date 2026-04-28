import { getSupabaseClient } from "../../lib/supabase.js";
import { trackEvent } from "../../lib/analytics.js";
import { captureAppError } from "../../lib/monitoring.js";

function getNoticeElement(source) {
  if (source === "pricing") return document.querySelector("[data-pricing-status]");
  if (source === "account") return document.querySelector("[data-account-billing-status]");
  return null;
}

function notify(source, message) {
  const notice = getNoticeElement(source);
  if (notice) notice.textContent = message;
}

/**
 * Start a Stripe Checkout session for the signed-in user.
 *
 * @param {("starter"|"team"|"club")} plan
 * @param {{source?: string, interval?: "month"|"year", organizationId?: string|null}} [opts]
 */
export async function startCheckout(plan, opts = {}) {
  const { source = "pricing", interval = "month", organizationId = null } = opts;
  trackEvent("checkout_started", { plan, source, interval });

  let accessToken = null;
  try {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || null;
  } catch (err) {
    captureAppError(err, { where: "startCheckout.getSession" });
  }

  if (!accessToken) {
    notify(source, "Please sign in before checking out.");
    const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.href = `./auth.html?next=${returnTo}`;
    return { ok: false, reason: "not_authenticated" };
  }

  notify(source, "Redirecting to secure checkout…");

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ plan, interval, organizationId }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = body?.error || `Checkout failed (${response.status})`;
      notify(source, message);
      trackEvent("checkout_failed", { plan, source, status: response.status });
      return { ok: false, reason: "server_error", status: response.status, message };
    }

    if (body?.url) {
      window.location.href = body.url;
      return { ok: true };
    }

    notify(source, "Checkout response was missing a redirect URL.");
    return { ok: false, reason: "no_url" };
  } catch (err) {
    captureAppError(err, { where: "startCheckout.fetch" });
    notify(source, "Could not reach checkout. Please try again.");
    return { ok: false, reason: "network_error" };
  }
}
