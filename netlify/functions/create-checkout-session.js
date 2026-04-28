// Netlify Functions v2 — uses Web API Request/Response.
// Creates a Stripe Checkout Session for an authenticated user.
//
// Required env vars:
//   STRIPE_SECRET_KEY
//   PUBLIC_SUPABASE_URL
//   PUBLIC_SUPABASE_ANON_KEY
//   STRIPE_PRICE_{STARTER,TEAM,CLUB}_{MONTHLY,ANNUAL}

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_ENV_MAP = {
  starter: { month: "STRIPE_PRICE_STARTER_MONTHLY", year: "STRIPE_PRICE_STARTER_ANNUAL" },
  team:    { month: "STRIPE_PRICE_TEAM_MONTHLY",    year: "STRIPE_PRICE_TEAM_ANNUAL"    },
  club:    { month: "STRIPE_PRICE_CLUB_MONTHLY",    year: "STRIPE_PRICE_CLUB_ANNUAL"    },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return json({ error: "Stripe is not configured (STRIPE_SECRET_KEY missing)" }, 501);
  }

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase server config missing" }, 501);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const plan = String(payload.plan || "").toLowerCase();
  const interval = payload.interval === "year" ? "year" : "month";
  const organizationId = payload.organizationId || null;

  const priceEnv = PRICE_ENV_MAP[plan]?.[interval];
  if (!priceEnv) {
    return json({ error: `Unknown plan "${plan}"` }, 400);
  }
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return json({ error: `Price not configured for ${plan}/${interval} (${priceEnv})` }, 501);
  }

  // Verify the bearer token belongs to a real Supabase user.
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    return json({ error: "Missing Authorization bearer token" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return json({ error: "Invalid session" }, 401);
  }
  const user = userData.user;

  // If the caller supplied an org id, confirm they're an owner/director of it.
  let verifiedOrgId = null;
  if (organizationId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role, status")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership || !["owner", "director"].includes(membership.role)) {
      return json({ error: "Not authorized to bill this organization" }, 403);
    }
    verifiedOrgId = organizationId;
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

  const appUrl = process.env.PUBLIC_APP_URL || new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        organization_id: verifiedOrgId || "",
        plan,
        billing_interval: interval,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          organization_id: verifiedOrgId || "",
          plan,
          billing_interval: interval,
        },
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/account.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing.html?checkout=canceled`,
    });

    return json({ id: session.id, url: session.url });
  } catch (err) {
    console.error("stripe checkout error:", err);
    return json({ error: "Could not create checkout session", detail: err.message }, 500);
  }
};

export const config = { path: "/api/create-checkout-session" };
