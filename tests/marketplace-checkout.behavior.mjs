// Behavioral test for netlify/functions/create-marketplace-checkout.js
// Mocks fetch to intercept Supabase + Stripe calls.
//
// Run with: node tests/marketplace-checkout.behavior.mjs

import assert from "node:assert/strict";

const supabaseState = {
  validToken: "valid-token",
  userId: "user-buyer",
  authoredBy: "user-author",  // different user — buyer is not author
  plans: {
    "plan-paid-ok": {
      id: "plan-paid-ok",
      title: "Breakout Progression",
      price_cents: 900,
      stripe_price_id: "price_test_breakout",
      is_published: true,
      author_user_id: "user-author",
    },
    "plan-unpublished": {
      id: "plan-unpublished",
      title: "Draft Pack",
      price_cents: 900,
      stripe_price_id: "price_test_draft",
      is_published: false,
      author_user_id: "user-author",
    },
    "plan-free": {
      id: "plan-free",
      title: "Free Skills",
      price_cents: 0,
      stripe_price_id: null,
      is_published: true,
      author_user_id: "user-author",
    },
    "plan-no-price-id": {
      id: "plan-no-price-id",
      title: "Pending Stripe Setup",
      price_cents: 1200,
      stripe_price_id: null,
      is_published: true,
      author_user_id: "user-author",
    },
    "plan-self-authored": {
      id: "plan-self-authored",
      title: "My Own Plan",
      price_cents: 500,
      stripe_price_id: "price_test_mine",
      is_published: true,
      author_user_id: "user-buyer",   // buyer authored this one
    },
  },
  ownedByBuyer: new Set(),  // plan IDs the buyer already owns (paid)
};

let lastStripeRequest = null;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();

  // Stripe checkout session creation — the function uses the SDK which posts here
  if (url.includes("api.stripe.com/v1/checkout/sessions")) {
    lastStripeRequest = { url, body: init.body, method };
    return jsonResponse({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
  }

  // Supabase auth: getUser
  if (url.includes("/auth/v1/user")) {
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
    const token = String(auth).replace(/^Bearer\s+/i, "");
    if (token === supabaseState.validToken) return jsonResponse({ id: supabaseState.userId });
    return jsonResponse({ message: "bad token" }, 401);
  }

  // Supabase REST: marketplace_plans single lookup
  if (url.includes("/rest/v1/marketplace_plans")) {
    // URL has eq.id=...&select=...
    const m = url.match(/[?&]id=eq\.([^&]+)/);
    const planId = m ? decodeURIComponent(m[1]) : null;
    const plan = planId && supabaseState.plans[planId];
    return jsonResponse(plan ? [plan] : []);
  }

  // Supabase REST: marketplace_purchases existing-paid lookup
  if (url.includes("/rest/v1/marketplace_purchases")) {
    const planM = url.match(/[?&]marketplace_plan_id=eq\.([^&]+)/);
    const planId = planM ? decodeURIComponent(planM[1]) : null;
    const owned = planId && supabaseState.ownedByBuyer.has(planId);
    return jsonResponse(owned ? [{ id: "p1", status: "paid" }] : []);
  }

  throw new Error("unexpected fetch: " + method + " " + url);
};

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.PUBLIC_SUPABASE_ANON_KEY = "fake-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
process.env.PUBLIC_APP_URL = "https://app.test";

const { default: handler } = await import("../netlify/functions/create-marketplace-checkout.js");

function makeReq(body, { token = "valid-token" } = {}) {
  return new Request("https://app.test/api/create-marketplace-checkout", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { fail++; console.error(`  ✗ ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log("create-marketplace-checkout behavioral tests\n");

await check("rejects non-POST", async () => {
  const res = await handler(new Request("https://app.test/", { method: "GET" }));
  assert.equal(res.status, 405);
});

await check("rejects missing bearer token", async () => {
  const res = await handler(new Request("https://app.test/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketplacePlanId: "plan-paid-ok" }),
  }));
  assert.equal(res.status, 401);
});

await check("rejects bad token", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "plan-paid-ok" }, { token: "garbage" }));
  assert.equal(res.status, 401);
});

await check("rejects missing planId", async () => {
  const res = await handler(makeReq({}));
  assert.equal(res.status, 400);
});

await check("404 for unknown plan", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "does-not-exist" }));
  assert.equal(res.status, 404);
});

await check("403 for unpublished plan", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "plan-unpublished" }));
  assert.equal(res.status, 403);
});

await check("400 for free plan (use Import instead)", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "plan-free" }));
  assert.equal(res.status, 400);
});

await check("501 when stripe_price_id not yet wired", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "plan-no-price-id" }));
  assert.equal(res.status, 501);
});

await check("400 when buyer is the author", async () => {
  const res = await handler(makeReq({ marketplacePlanId: "plan-self-authored" }));
  assert.equal(res.status, 400);
});

await check("409 when already owned (no double-buy)", async () => {
  supabaseState.ownedByBuyer.add("plan-paid-ok");
  const res = await handler(makeReq({ marketplacePlanId: "plan-paid-ok" }));
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "already_owned");
  supabaseState.ownedByBuyer.clear();
});

await check("happy path returns Stripe URL with correct metadata", async () => {
  lastStripeRequest = null;
  const res = await handler(makeReq({ marketplacePlanId: "plan-paid-ok" }));
  assert.equal(res.status, 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert.equal(body.url, "https://checkout.stripe.com/c/pay/cs_test_123");
  assert.ok(lastStripeRequest, "Stripe should have been called");
  // Stripe SDK form-encodes — make sure the right metadata was sent.
  // Brackets stay literal in the body (only values are percent-encoded).
  const formBody = String(lastStripeRequest.body);
  assert.match(formBody, /mode=payment/);
  assert.match(formBody, /metadata\[purchase_kind\]=marketplace_plan/);
  assert.match(formBody, /metadata\[marketplace_plan_id\]=plan-paid-ok/);
  assert.match(formBody, /metadata\[supabase_user_id\]=user-buyer/);
  assert.match(formBody, /line_items\[0\]\[price\]=price_test_breakout/);
  assert.match(formBody, /payment_intent_data\[metadata\]\[purchase_kind\]=marketplace_plan/);
  assert.match(formBody, /success_url=https%3A%2F%2Fapp\.test%2Fmarketplace\.html%3Fpurchase%3Dsuccess/);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
