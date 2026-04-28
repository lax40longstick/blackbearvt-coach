import { getSupabaseClient } from "../../lib/supabase.js";

function cleanText(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function compactDrillForAI(drill) {
  return {
    id: drill.id,
    name: drill.name,
    category: drill.category,
    duration: drill.duration,
    ageLevels: drill.ageLevels || [],
    skillFocus: drill.skillFocus || drill.tags || [],
    iceUsage: drill.iceUsage || drill.ice_type || "",
    difficulty: drill.difficulty || drill.intensity || "",
    animated: Boolean(drill.animated || drill.diagram),
    description: drill.description || drill.instructions || "",
  };
}

function getAccessToken() {
  return getSupabaseClient()
    .then((supabase) => supabase.auth.getSession())
    .then(({ data }) => data?.session?.access_token || null)
    .catch(() => null);
}

function normalizeClientPlan(plan, state) {
  const validDrillIds = new Set((state.drills || []).map((drill) => drill.id));
  const blocks = (plan.blocks || [])
    .filter((block) => validDrillIds.has(block.drillId))
    .map((block) => ({
      id: block.id || crypto.randomUUID(),
      drillId: block.drillId,
      minutes: Number(block.minutes) || 8,
      label: cleanText(block.label, 80),
      objective: cleanText(block.objective, 260),
      coachNote: cleanText(block.coachNote, 220),
      intensity: cleanText(block.intensity, 30),
      teachingMoment: cleanText(block.teachingMoment, 220),
    }));

  return {
    id: null,
    date: plan.date || new Date().toISOString().slice(0, 10),
    title: cleanText(plan.title, 120) || "AI Practice",
    theme: cleanText(plan.theme, 120) || "AI Built",
    progression: cleanText(plan.progression, 60) || "AI Built",
    totalMinutes: Number(plan.totalMinutes) || 60,
    notes: cleanText(plan.notes, 800),
    coachBrain: plan.coachBrain || { source: "ai-practice-builder", generatedAt: new Date().toISOString() },
    blocks,
  };
}


function addPracticeScore(plan, state, options = {}) {
  if (!window.BearDenHQ?.scoreDrill) return plan;
  const byId = new Map((state.drills || []).map((drill) => [drill.id, drill]));
  const context = {
    ageGroup: options.ageGroup || "10U",
    includeGoalie: options.includeGoalie !== false,
    focus: options.focus || options.theme || plan.theme || "",
    notes: options.notes || plan.notes || "",
  };
  const blockScores = (plan.blocks || []).map((block) => {
    const drill = byId.get(block.drillId);
    const score = drill ? window.BearDenHQ.scoreDrill(drill, context) : null;
    return score ? { drillId: block.drillId, overall: score.overall, label: score.label, reason: score.reason } : null;
  }).filter(Boolean);
  const overall = blockScores.length
    ? Math.round(blockScores.reduce((sum, item) => sum + item.overall, 0) / blockScores.length)
    : 0;
  return {
    ...plan,
    coachBrain: {
      ...(plan.coachBrain || {}),
      practiceScore: overall,
      drillScores: blockScores,
      scoringVersion: "0.3.4",
    },
  };
}

function localFallbackPlan(options, state, reason) {
  const plan = window.BearDenHQ?.generateCoachPlan?.({
    theme: options.theme || "mixed",
    progression: options.progression || "balanced",
    duration: options.duration || 60,
    avoidRecent: options.avoidRecent,
    ageGroup: options.ageGroup,
    includeGoalie: options.includeGoalie,
  }, state);
  if (!plan) throw new Error(reason || "AI builder unavailable and fallback planner missing");
  plan.title = `Fallback: ${plan.title || "Generated Practice"}`;
  plan.notes = `${reason || "AI was unavailable."} Built locally from the animated drill library.`;
  plan.coachBrain = {
    ...(plan.coachBrain || {}),
    source: "local-fallback-after-ai-error",
    fallbackReason: reason || "AI unavailable",
    generatedAt: new Date().toISOString(),
  };
  return addPracticeScore(plan, state, options);
}

async function buildAIPracticePlan(options, state) {
  const drills = (state.drills || [])
    .map(compactDrillForAI)
    .filter((drill) => drill.id && drill.name)
    .slice(0, 120);

  const accessToken = await getAccessToken();
  const headers = { "content-type": "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const payload = {
    ageGroup: options.ageGroup || "10U",
    duration: Number(options.duration) || 60,
    focus: cleanText(options.focus, 500),
    notes: cleanText(options.notes, 500),
    theme: options.theme || "mixed",
    progression: options.progression || "balanced",
    includeGoalie: options.includeGoalie !== false,
    avoidRecent: Boolean(options.avoidRecent),
    rosterSize: Array.isArray(state.roster) ? state.roster.length : 12,
    recentPlans: (state.plans || []).slice(-5).map((plan) => ({
      title: plan.title,
      theme: plan.theme,
      drillIds: (plan.blocks || []).map((block) => block.drillId),
    })),
    drills,
  };

  try {
    const response = await fetch("/api/ai-practice-builder", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.plan) {
      const message = body?.error || `AI request failed (${response.status})`;
      return localFallbackPlan(options, state, message);
    }
    return addPracticeScore(normalizeClientPlan(body.plan, state), state, options);
  } catch (err) {
    return localFallbackPlan(options, state, err.message || "Network error");
  }
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  buildAIPracticePlan,
};
