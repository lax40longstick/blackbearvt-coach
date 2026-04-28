// Behavioral test for the AI Practice Builder handler.
// Mocks fetch at the network layer (Supabase + OpenAI) so the real handler runs in-process.
//
// Run with: node tests/ai-handler.behavior.mjs

import assert from "node:assert/strict";

// ---- Test state ----
const supabaseState = { plan: "starter", count: 0, logs: [], validToken: "valid-token", userId: "user-abc" };
let nextOpenAIResponse = null;

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

// ---- Single fetch mock that handles both Supabase and OpenAI ----
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || (typeof input !== "string" ? input.method : "GET") || "GET").toUpperCase();

  if (url.includes("api.openai.com")) {
    if (!nextOpenAIResponse) throw new Error("test forgot to set nextOpenAIResponse");
    return nextOpenAIResponse;
  }

  if (url.includes("/auth/v1/user")) {
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
    const token = String(auth).replace(/^Bearer\s+/i, "");
    if (token === supabaseState.validToken) return jsonResponse({ id: supabaseState.userId });
    return jsonResponse({ message: "bad token" }, 401);
  }

  if (url.includes("/rest/v1/memberships")) {
    return jsonResponse([{ organizations: { plan: supabaseState.plan } }]);
  }

  if (url.includes("/rest/v1/ai_generation_logs")) {
    if (method === "POST") {
      try { supabaseState.logs.push(JSON.parse(init.body)); } catch { /* ignore */ }
      return jsonResponse({}, 201);
    }
    // count=exact head request → respond with Content-Range header
    return jsonResponse([], 200, { "content-range": `0-0/${supabaseState.count}` });
  }

  throw new Error("unexpected fetch: " + method + " " + url);
};

process.env.OPENAI_API_KEY = "sk-test";
process.env.PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
process.env.PUBLIC_SUPABASE_ANON_KEY = "fake-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service";
process.env.AI_RATE_LIMIT_PER_MINUTE = "3";

const { default: handler } = await import("../netlify/functions/ai-practice-builder.js");

// Each test gets its own IP so they don't share the in-memory rate-limit bucket
// (bucket key is userId:ip). The rate-limit test deliberately reuses one IP.
let testIpCounter = 0;
function makeReq(body, { token = "valid-token", method = "POST", ip } = {}) {
  return new Request("https://app.test/api/ai-practice-builder", {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-forwarded-for": ip || `10.0.0.${++testIpCounter}`,
    },
    body: JSON.stringify(body),
  });
}

const drills = Array.from({ length: 6 }, (_, i) => ({
  id: `drill-${i}`,
  name: `Drill ${i}`,
  category: i === 5 ? "goalie" : "skating",
  duration: 8,
  description: "test drill",
}));

const goodPlan = {
  title: "Test Plan",
  theme: "skating",
  totalMinutes: 60,
  notes: "",
  blocks: [
    { drillId: "drill-0", minutes: 10, label: "Warm-up", objective: "skate", coachNote: "go", intensity: "low", teachingMoment: "edges" },
    { drillId: "drill-1", minutes: 15, label: "Skill", objective: "pass", coachNote: "tape", intensity: "medium", teachingMoment: "form" },
    { drillId: "drill-2", minutes: 15, label: "Concept", objective: "rush", coachNote: "speed", intensity: "high", teachingMoment: "support" },
  ],
};

function okOpenAI(plan) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] }), {
    status: 200, headers: { "content-type": "application/json" },
  });
}

let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { fail++; console.error(`  ✗ ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log("ai-practice-builder behavioral tests\n");

await check("returns 405 for non-POST", async () => {
  const res = await handler(new Request("https://app.test/", { method: "GET" }));
  assert.equal(res.status, 405);
});

await check("returns 401 with bad token", async () => {
  const res = await handler(makeReq({ drills }, { token: "garbage" }));
  assert.equal(res.status, 401);
});

await check("blocks unsafe prompt (validatePromptSafety fires)", async () => {
  supabaseState.count = 0;
  supabaseState.logs.length = 0;
  const res = await handler(makeReq({ drills, focus: "I want them to fight harder", duration: 60 }));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, "unsafe_prompt");
  assert.ok(supabaseState.logs.some((l) => l.status === "blocked"), "should log blocked event");
});

await check("rejects when drill library too small", async () => {
  const res = await handler(makeReq({ drills: drills.slice(0, 2), focus: "skating", duration: 60 }));
  assert.equal(res.status, 400);
});

await check("happy path returns plan + usage with userPlan/used/allowed in scope", async () => {
  supabaseState.count = 0;
  supabaseState.plan = "starter";
  nextOpenAIResponse = okOpenAI(goodPlan);
  const res = await handler(makeReq({ drills, focus: "skating fundamentals", duration: 60 }));
  assert.equal(res.status, 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.plan, "plan should be returned");
  assert.deepEqual(body.usage, { plan: "starter", used: 1, allowed: 5 });
});

await check("blocks at monthly quota (countAiGenerations fires)", async () => {
  supabaseState.count = 5;
  supabaseState.plan = "starter";
  nextOpenAIResponse = okOpenAI(goodPlan);
  const res = await handler(makeReq({ drills, focus: "skating", duration: 60 }));
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.code, "quota_exceeded");
  assert.equal(body.usage.allowed, 5);
});

await check("club plan gets higher quota", async () => {
  supabaseState.count = 10;
  supabaseState.plan = "club";
  nextOpenAIResponse = okOpenAI(goodPlan);
  const res = await handler(makeReq({ drills, focus: "skating", duration: 60 }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.usage.plan, "club");
  assert.equal(body.usage.allowed, 120);
});

await check("per-minute rate limit kicks in (rateLimit fires)", async () => {
  supabaseState.count = 0;
  supabaseState.plan = "club";
  // Pin to one IP so all calls share a bucket. Limit is 3.
  const ip = "192.168.99.99";
  let lastStatus = 0;
  for (let i = 0; i < 6; i++) {
    nextOpenAIResponse = okOpenAI(goodPlan);
    const res = await handler(makeReq({ drills, focus: "skating", duration: 60 }, { ip }));
    lastStatus = res.status;
    if (res.status === 429) {
      const body = await res.json();
      assert.equal(body.code, "rate_limited");
      return;
    }
  }
  assert.fail(`rate limit never tripped after 6 attempts (last status ${lastStatus})`);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
