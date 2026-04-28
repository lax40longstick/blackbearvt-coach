// Netlify Functions v2 — create-marketplace-checkout
// Creates a one-time Stripe Checkout Session for a paid marketplace pack.
//
// Required env vars:
//   STRIPE_SECRET_KEY
//   PUBLIC_SUPABASE_URL
//   PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY  (used to read marketplace_plans bypassing RLS)
//
// Request body: { marketplacePlanId: "<uuid>" }
// Response: { id, url } on success; { error } otherwise.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey) return json({ error: "Stripe is not configured (STRIPE_SECRET_KEY missing)" }, 501);
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Supabase server config missing" }, 501);
  }

  // 1. Verify the bearer token
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return json({ error: "Missing Authorization bearer token" }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData?.user) return json({ error: "Invalid session" }, 401);
  const user = userData.user;

  // 2. Parse the request
  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const marketplacePlanId = String(payload.marketplacePlanId || payload.planId || "").trim();
  if (!marketplacePlanId) return json({ error: "Missing marketplacePlanId" }, 400);

  // 3. Look up the marketplace plan (use service role so we can read regardless of RLS)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: plan, error: planError } = await adminClient
    .from("marketplace_plans")
    .select("id, title, price_cents, stripe_price_id, is_published, author_user_id")
    .eq("id", marketplacePlanId)
    .maybeSingle();

  if (planError) {
    console.error("marketplace-checkout: plan lookup failed", planError);
    return json({ error: "Could not load marketplace plan" }, 500);
  }
  if (!plan) return json({ error: "Marketplace plan not found" }, 404);
  if (!plan.is_published) return json({ error: "This plan is not available for purchase" }, 403);
  if (plan.author_user_id === user.id) return json({ error: "You authored this plan — no purchase needed" }, 400);
  if (!plan.price_cents || plan.price_cents <= 0) {
    return json({ error: "This plan is free; use the Import button instead" }, 400);
  }
  if (!plan.stripe_price_id) {
    return json({ error: "This plan is missing a Stripe price ID — contact support" }, 501);
  }

  // 4. Has the user already paid for this plan? Block double-buy.
  const { data: existing } = await adminClient
    .from("marketplace_purchases")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("marketplace_plan_id", plan.id)
    .eq("status", "paid")
    .maybeSingle();
  if (existing) {
    return json({ error: "You already own this plan", code: "already_owned" }, 409);
  }

  // 5. Create the one-time checkout session
  // Use the fetch-based HTTP client so this function is edge-runtime compatible
  // and so behavioral tests can intercept Stripe calls at the fetch layer.
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const appUrl = process.env.PUBLIC_APP_URL || new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        purchase_kind: "marketplace_plan",
        supabase_user_id: user.id,
        marketplace_plan_id: plan.id,
        marketplace_plan_title: plan.title,
      },
      payment_intent_data: {
        metadata: {
          purchase_kind: "marketplace_plan",
          supabase_user_id: user.id,
          marketplace_plan_id: plan.id,
        },
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/marketplace.html?purchase=success&plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace.html?purchase=canceled&plan=${plan.id}`,
    });

    return json({ id: session.id, url: session.url });
  } catch (err) {
    console.error("marketplace-checkout: stripe error", err);
    return json({ error: "Could not create checkout session", detail: err.message }, 500);
  }
};

export const config = { path: "/api/create-marketplace-checkout" };
