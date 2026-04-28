import { getSupabaseClient } from "../../lib/supabase.js";
import { trackEvent } from "../../lib/analytics.js";

const TABLE = "marketplace_plans";
const CHECKOUT_FN = "/api/create-marketplace-checkout";

function safe(value) { return String(value ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function money(cents) { return Number(cents || 0) > 0 ? `$${(Number(cents)/100).toFixed(2)}` : "Free"; }
const STARTER_PACKS = [
  { id: "pack-u10-skills", title: "U10 Skill Builder Pack", author_name: "Bear Den Coaching", age_group: "10U", focus: "Skating · Passing · Compete", price_cents: 0, rating_avg: 4.8, rating_count: 42, plan_data: { title: "U10 Skill Builder", theme: "Skill development", totalMinutes: 60, blocks: [] } },
  { id: "pack-breakouts", title: "Breakout Progression Pack", author_name: "Bear Den Coaching", age_group: "12U+", focus: "Breakouts · Support · Transition", price_cents: 900, rating_avg: 4.9, rating_count: 18, plan_data: { title: "Breakout Progression", theme: "Breakouts", totalMinutes: 60, blocks: [] } },
  { id: "pack-goalie", title: "Goalie Touch Practice Pack", author_name: "Bear Den Coaching", age_group: "All", focus: "Goalie · Shooting · Rebounds", price_cents: 700, rating_avg: 4.7, rating_count: 13, plan_data: { title: "Goalie Touch Practice", theme: "Goalie", totalMinutes: 60, blocks: [] } }
];

async function fetchMarketplacePlans() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from(TABLE).select("*").eq("is_published", true).order("rating_avg", { ascending: false }).limit(50);
    if (error) throw error;
    return data?.length ? data : STARTER_PACKS;
  } catch (err) { console.warn("Marketplace fallback", err.message); return STARTER_PACKS; }
}

function renderPlanCard(plan) {
  const isPaid = Number(plan.price_cents || 0) > 0;
  const primaryBtn = isPaid
    ? `<button class="btn primary" data-buy-plan="${safe(plan.id)}">Buy ${safe(money(plan.price_cents))}</button>`
    : `<button class="btn primary" data-import-plan="${safe(plan.id)}">Import</button>`;
  return `<article class="market-card"><div class="market-kicker">${safe(plan.age_group || "Youth Hockey")}</div><h3>${safe(plan.title)}</h3><p>${safe(plan.focus || plan.theme || "Practice plan")}</p><div class="market-meta"><span>★ ${Number(plan.rating_avg || 0).toFixed(1)} (${Number(plan.rating_count || 0)})</span><span>${safe(money(plan.price_cents))}</span></div><div class="market-author">By ${safe(plan.author_name || "Coach")}</div><div class="btn-row">${primaryBtn}</div></article>`;
}

async function importMarketplacePlan(planId, state = window.state) {
  const plans = await fetchMarketplacePlans();
  const plan = plans.find((p) => String(p.id) === String(planId));
  if (!plan) throw new Error("Plan not found");
  const imported = { ...(plan.plan_data || {}), id: null, title: plan.plan_data?.title || plan.title, importedFromMarketplace: plan.id, savedAt: new Date().toISOString() };
  if (state) { state.currentPlan = imported; state.plans = [...(state.plans || []), imported]; window.saveState?.(); window.renderAll?.(); }
  trackEvent("marketplace_plan_imported", { planId: plan.id, priceCents: plan.price_cents || 0 });
  return imported;
}

async function buyMarketplacePlan(planId) {
  const supabase = await getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = `./auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }
  trackEvent("marketplace_buy_clicked", { planId });

  const response = await fetch(CHECKOUT_FN, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ marketplacePlanId: planId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) {
    window.toast?.(body.error || "Could not start checkout");
    return;
  }
  window.location.href = body.url;
}

function handleReturnFromCheckout() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("purchase");
  if (!status) return;
  if (status === "success") {
    window.toast?.("Purchase complete! Refresh to see it in your library.");
    trackEvent("marketplace_purchase_success", { planId: params.get("plan") || null });
  } else if (status === "canceled") {
    window.toast?.("Checkout canceled — no charges made.");
  }
  // Clean the URL so a refresh doesn't re-toast.
  if (window.history?.replaceState) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }
}

export async function renderMarketplace(target = "marketplaceRoot", state = window.state) {
  const root = typeof target === "string" ? document.getElementById(target) : target;
  if (!root) return;
  root.innerHTML = `<div class="loading">Loading practice marketplace…</div>`;
  const plans = await fetchMarketplacePlans();
  root.innerHTML = `<section class="market-shell"><div class="market-hero"><div><div class="market-kicker">Practice Marketplace</div><h1>Premium drill packs and coach-created plans</h1><p>Import free packs now. Paid packs require Stripe product setup.</p></div></div><div class="market-grid">${plans.map(renderPlanCard).join("")}</div></section>`;
  root.addEventListener("click", async (event) => {
    const importBtn = event.target.closest("[data-import-plan]");
    if (importBtn) {
      try { await importMarketplacePlan(importBtn.dataset.importPlan, state); window.toast?.("Practice imported"); }
      catch (err) { window.toast?.(err.message || "Import failed"); }
      return;
    }
    const buyBtn = event.target.closest("[data-buy-plan]");
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.textContent = "Loading…";
      try { await buyMarketplacePlan(buyBtn.dataset.buyPlan); }
      finally { buyBtn.disabled = false; }
    }
  });
  handleReturnFromCheckout();
}

window.BearDenHQ = { ...(window.BearDenHQ || {}), renderMarketplace, importMarketplacePlan, buyMarketplacePlan };
