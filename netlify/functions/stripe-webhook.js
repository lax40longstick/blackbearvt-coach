// Netlify Functions v2 — verified Stripe webhook.
// Handles subscription lifecycle events and syncs state into Supabase.
//
// Required env vars:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (required — the webhook writes bypassing RLS)

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_ID_TO_PLAN_INTERVAL = () => {
  const map = {};
  const add = (envName, plan, interval) => {
    const id = process.env[envName];
    if (id) map[id] = { plan, interval };
  };
  add("STRIPE_PRICE_STARTER_MONTHLY", "starter", "month");
  add("STRIPE_PRICE_STARTER_ANNUAL",  "starter", "year");
  add("STRIPE_PRICE_TEAM_MONTHLY",    "team",    "month");
  add("STRIPE_PRICE_TEAM_ANNUAL",     "team",    "year");
  add("STRIPE_PRICE_CLUB_MONTHLY",    "club",    "month");
  add("STRIPE_PRICE_CLUB_ANNUAL",     "club",    "year");
  return map;
};

function toIso(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function deriveFromSubscription(subscription, priceMap) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id || null;
  const fallbackInterval = item?.price?.recurring?.interval || "month";
  const mapped = priceId ? priceMap[priceId] : null;

  return {
    plan: mapped?.plan || subscription.metadata?.plan || null,
    interval: mapped?.interval || fallbackInterval,
    priceId,
  };
}

async function upsertSubscriptionRow(supabase, subscription, organizationId) {
  const priceMap = PRICE_ID_TO_PLAN_INTERVAL();
  const { plan, interval, priceId } = deriveFromSubscription(subscription, priceMap);

  if (!plan) {
    console.warn("webhook: could not derive plan for subscription", subscription.id);
    return;
  }

  const row = {
    organization_id: organizationId,
    stripe_customer_id: typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan,
    status: subscription.status,
    billing_interval: interval,
    current_period_start: toIso(subscription.current_period_start),
    current_period_end: toIso(subscription.current_period_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
    trial_ends_at: toIso(subscription.trial_end),
    updated_at: new Date().toISOString(),
  };

  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "organization_id" });
  if (subErr) {
    console.error("webhook: subscriptions upsert failed", subErr);
    throw subErr;
  }

  const { error: orgErr } = await supabase
    .from("organizations")
    .update({
      plan,
      subscription_status: subscription.status,
      trial_ends_at: toIso(subscription.trial_end),
    })
    .eq("id", organizationId);
  if (orgErr) {
    console.error("webhook: organization update failed", orgErr);
    throw orgErr;
  }
}

async function resolveOrganizationId(supabase, subscription, session = null) {
  const direct = session?.metadata?.organization_id
    || subscription?.metadata?.organization_id;
  if (direct) return direct;

  const supabaseUserId = session?.client_reference_id
    || session?.metadata?.supabase_user_id
    || subscription?.metadata?.supabase_user_id;
  if (!supabaseUserId) return null;

  // User had no organization at checkout time — find the one they own.
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", supabaseUserId)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return membership?.organization_id || null;
}

async function recordMarketplacePurchase(supabase, session) {
  const planId = session.metadata?.marketplace_plan_id;
  const userId = session.client_reference_id || session.metadata?.supabase_user_id;
  if (!planId || !userId) {
    console.warn("webhook: marketplace purchase missing metadata", session.id);
    return;
  }

  const row = {
    user_id: userId,
    marketplace_plan_id: planId,
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    amount_cents: Number(session.amount_total) || 0,
    currency: (session.currency || "usd").toLowerCase(),
    status: session.payment_status === "paid" ? "paid" : "pending",
    purchased_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("marketplace_purchases")
    .upsert(row, { onConflict: "stripe_session_id" });
  if (error) {
    console.error("webhook: marketplace_purchases upsert failed", error);
    throw error;
  }
}

async function refundMarketplacePurchase(supabase, paymentIntentId) {
  if (!paymentIntentId) return;
  const { error } = await supabase
    .from("marketplace_purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) console.error("webhook: marketplace refund mark failed", error);
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "content-type": "application/json" },
    });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("webhook: missing required env vars");
    return new Response("Server not configured", { status: 501 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("webhook: signature verification failed", err.message);
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Marketplace one-time purchase
        if (session.mode === "payment" && session.metadata?.purchase_kind === "marketplace_plan") {
          await recordMarketplacePurchase(supabase, session);
          break;
        }
        // Subscription checkout
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const orgId = await resolveOrganizationId(supabase, subscription, session);
          if (!orgId) {
            console.warn("webhook: checkout.session.completed without resolvable org", session.id);
            break;
          }
          await upsertSubscriptionRow(supabase, subscription, orgId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        if (charge.payment_intent && charge.metadata?.purchase_kind === "marketplace_plan") {
          await refundMarketplacePurchase(supabase, charge.payment_intent);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const subscription = event.data.object;
        const orgId = await resolveOrganizationId(supabase, subscription);
        if (!orgId) {
          console.warn("webhook: subscription event without resolvable org", subscription.id);
          break;
        }
        await upsertSubscriptionRow(supabase, subscription, orgId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const orgId = await resolveOrganizationId(supabase, subscription);
        if (orgId) await upsertSubscriptionRow(supabase, subscription, orgId);
        break;
      }

      default:
        // Unhandled event types are OK — acknowledge with 200 so Stripe stops retrying.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("webhook: handler error", err);
    return new Response(`Webhook handler error: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: "/api/stripe-webhook",
  // Required — Stripe needs the raw body for signature verification.
  // Netlify v2 doesn't parse the body if we call req.text() directly, so this is fine.
};
