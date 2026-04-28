// Netlify Functions v2 — AI Practice Builder
// Builds a structured hockey practice plan from coach intent and the app drill library.
//
// Required for live AI:
//   OPENAI_API_KEY
// Optional:
//   OPENAI_MODEL (default: gpt-4o-mini)
//   PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY for bearer-token verification

import { createClient } from "@supabase/supabase-js";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MAX_DRILLS_SENT_TO_MODEL = 120;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_PER_WINDOW = Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 8);
const PLAN_LIMITS = { starter: 5, team: 25, club: 120 };
const rateBuckets = new Map();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanText(value, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clientIp(req) { return req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function rateLimit(req, userId = "anon") {
  const key = userId + ":" + clientIp(req);
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + RATE_WINDOW_MS; }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count <= RATE_LIMIT_PER_WINDOW;
}
function validatePromptSafety(payload) {
  const text = String((payload.focus || "") + " " + (payload.notes || "")).toLowerCase();
  const blocked = ["hurt", "injure", "cheap shot", "retaliate", "fight", "weapon", "concussion protocol workaround"];
  const hit = blocked.find((term) => text.includes(term));
  if (hit) return { ok: false, error: "Practice request includes unsafe or unsportsmanlike instruction. Revise it toward safe skill development." };
  return { ok: true };
}
async function getOrgPlanForUser(userId) {
  if (!userId || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PUBLIC_SUPABASE_URL) return "starter";
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("memberships").select("organizations(plan)").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  return data?.organizations?.plan || "starter";
}
async function countAiGenerations(userId) {
  if (!userId || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PUBLIC_SUPABASE_URL) return 0;
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("ai_generation_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  return count || 0;
}
async function logAiGeneration({ userId, plan, payload, status, error }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PUBLIC_SUPABASE_URL) return;
  const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await supabase.from("ai_generation_logs").insert({ user_id: userId || null, status, prompt: cleanText(payload?.focus || "", 500), metadata: { ageGroup: payload?.ageGroup, duration: payload?.duration, theme: payload?.theme, planTitle: plan?.title || null, error: error || null } });
}

function safeArray(value, max = 12) {
  return Array.isArray(value) ? value.slice(0, max).map((v) => cleanText(v, 80)).filter(Boolean) : [];
}

function compactDrill(drill) {
  return {
    id: cleanText(drill.id, 80),
    name: cleanText(drill.name, 120),
    category: cleanText(drill.category, 40),
    duration: clampNumber(drill.duration, 1, 30, 8),
    ageLevels: safeArray(drill.ageLevels, 6),
    skillFocus: safeArray(drill.skillFocus || drill.tags, 8),
    iceUsage: cleanText(drill.iceUsage || drill.ice_type, 40),
    difficulty: cleanText(drill.difficulty || drill.intensity, 40),
    goalie: drill.category === "goalie" || safeArray(drill.tags, 12).some((tag) => /goal/i.test(tag)),
    animated: Boolean(drill.animated || drill.diagram),
    description: cleanText(drill.description || drill.instructions, 220),
  };
}

async function verifyOptionalSession(req) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return { ok: true, user: null, mode: "unverified-dev" };

  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return { ok: false, status: 401, error: "Missing Authorization bearer token" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return { ok: false, status: 401, error: "Invalid session" };
  return { ok: true, user: data.user, mode: "verified" };
}

function buildSystemPrompt() {
  return `You are an elite youth ice hockey practice planner. Return ONLY valid JSON. Build safe, age-appropriate, high-tempo practice plans from the provided drill library. Prefer animated drills when suitable. Do not invent drill IDs. Use exact drill ids from the drill_library. Balance teaching, repetitions, fun, transitions, water/rest, and goalie involvement when requested.`;
}

function buildUserPrompt(payload, drills) {
  const request = {
    ageGroup: cleanText(payload.ageGroup, 20) || "10U",
    duration: clampNumber(payload.duration, 30, 120, 60),
    focus: cleanText(payload.focus, 500) || "balanced skill development",
    theme: cleanText(payload.theme, 60) || "mixed",
    progression: cleanText(payload.progression, 40) || "balanced",
    includeGoalie: payload.includeGoalie !== false,
    avoidRecent: Boolean(payload.avoidRecent),
    rosterSize: clampNumber(payload.rosterSize, 4, 30, 12),
    notes: cleanText(payload.notes, 500),
  };

  return JSON.stringify({
    task: "Build a complete hockey practice plan.",
    output_schema: {
      title: "string",
      theme: "string",
      totalMinutes: "number",
      notes: "string",
      blocks: [
        {
          label: "Warm-up | Skill Build | Team Concept | Small-Area Game | Finisher etc.",
          drillId: "exact id from drill_library",
          minutes: "number",
          objective: "specific coaching objective",
          coachNote: "short on-ice cue",
          intensity: "low | medium | high",
          teachingMoment: "what to freeze/correct",
        },
      ],
      coachingSummary: {
        whyThisPlanWorks: "string",
        keyCues: ["string"],
        adjustments: ["string"],
      },
    },
    rules: [
      "Use only exact drillId values from drill_library.",
      "Sum block minutes as close as possible to requested duration.",
      "Prefer drills with animated=true when they match the intent.",
      "If includeGoalie=true, include at least one goalie drill or goalie-relevant drill when available.",
      "Avoid duplicate drill IDs.",
      "Keep each block practical for one coach on ice.",
    ],
    request,
    drill_library: drills,
  });
}

function parseModelJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Empty AI response");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI response did not contain a JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizePlan(plan, payload, allowedIds) {
  const totalMinutes = clampNumber(payload.duration, 30, 120, 60);
  const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const seen = new Set();
  const normalizedBlocks = blocks
    .map((block) => {
      const drillId = cleanText(block.drillId, 100);
      if (!allowedIds.has(drillId) || seen.has(drillId)) return null;
      seen.add(drillId);
      return {
        id: crypto.randomUUID(),
        drillId,
        minutes: clampNumber(block.minutes, 1, 30, 8),
        label: cleanText(block.label, 80) || "Practice Block",
        objective: cleanText(block.objective, 260),
        coachNote: cleanText(block.coachNote, 220),
        intensity: cleanText(block.intensity, 30),
        teachingMoment: cleanText(block.teachingMoment, 220),
      };
    })
    .filter(Boolean)
    .slice(0, 9);

  return {
    id: null,
    date: new Date().toISOString().slice(0, 10),
    title: cleanText(plan.title, 120) || `AI ${cleanText(payload.ageGroup, 20) || "Youth"} Practice`,
    theme: cleanText(plan.theme, 120) || cleanText(payload.focus, 120) || "AI Practice",
    progression: cleanText(payload.progression, 40) || "AI Built",
    totalMinutes,
    notes: cleanText(plan.notes, 500) || "Generated by AI from your drill library.",
    coachBrain: {
      source: "ai-practice-builder",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      generatedAt: new Date().toISOString(),
      request: {
        ageGroup: cleanText(payload.ageGroup, 20),
        focus: cleanText(payload.focus, 220),
        theme: cleanText(payload.theme, 60),
        progression: cleanText(payload.progression, 40),
      },
      coachingSummary: plan.coachingSummary || null,
    },
    blocks: normalizedBlocks,
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Auth (optional in dev mode where Supabase env is not set)
  const auth = await verifyOptionalSession(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const userId = auth.user?.id || null;

  // 2. Per-minute rate limit (cheap; runs before any DB / model work)
  if (!rateLimit(req, userId || "anon")) {
    return json({ error: "Too many AI requests. Wait a minute and try again.", code: "rate_limited" }, 429);
  }

  // 3. Parse body
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // 4. Prompt safety — block unsafe / unsportsmanlike prompts before they reach OpenAI
  const safety = validatePromptSafety(payload);
  if (!safety.ok) {
    await logAiGeneration({ userId, payload, status: "blocked", error: safety.error });
    return json({ error: safety.error, code: "unsafe_prompt" }, 400);
  }

  // 5. Drill library validity
  const incomingDrills = Array.isArray(payload.drills) ? payload.drills : [];
  const drillLibrary = incomingDrills.map(compactDrill).filter((d) => d.id && d.name).slice(0, MAX_DRILLS_SENT_TO_MODEL);
  if (drillLibrary.length < 3) return json({ error: "Not enough drills to build a plan" }, 400);

  // 6. OpenAI key configured
  if (!process.env.OPENAI_API_KEY) {
    return json({ error: "AI is not configured. Add OPENAI_API_KEY to Netlify environment variables.", code: "missing_openai_key" }, 501);
  }

  // 7. Plan-based monthly quota
  const userPlan = await getOrgPlanForUser(userId);
  const allowed = PLAN_LIMITS[userPlan] || PLAN_LIMITS.starter;
  const used = userId ? await countAiGenerations(userId) : 0;
  if (userId && used >= allowed) {
    await logAiGeneration({ userId, payload, status: "blocked", error: "quota_exceeded" });
    return json({
      error: `Monthly AI limit reached for ${userPlan} plan (${used}/${allowed}). Upgrade or wait until next month.`,
      code: "quota_exceeded",
      usage: { plan: userPlan, used, allowed },
    }, 429);
  }

  // 8. OpenAI call
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(payload, drillLibrary) },
        ],
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body?.error?.message || response.statusText;
      console.error("ai-practice-builder OpenAI error", body);
      await logAiGeneration({ userId, payload, status: "error", error: `openai:${detail}` });
      return json({ error: "AI provider failed to generate a plan", detail }, 502);
    }

    const text = body?.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(text);
    const normalized = normalizePlan(parsed, payload, new Set(drillLibrary.map((d) => d.id)));
    if (normalized.blocks.length < 3) {
      await logAiGeneration({ userId, payload, status: "error", error: "too_few_blocks" });
      return json({ error: "AI returned too few usable drill blocks" }, 502);
    }

    await logAiGeneration({ userId, plan: normalized, payload, status: "success" });
    return json({
      ok: true,
      plan: normalized,
      authMode: auth.mode,
      usage: { plan: userPlan, used: used + 1, allowed },
    });
  } catch (err) {
    console.error("ai-practice-builder error", err);
    await logAiGeneration({ userId, payload, status: "error", error: err.message });
    return json({ error: "Could not generate AI practice", detail: err.message }, 500);
  }
};

export const config = { path: "/api/ai-practice-builder" };
