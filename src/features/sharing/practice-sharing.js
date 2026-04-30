import { getSupabaseClient } from "../../lib/supabase.js";

const SHARE_VERSION = "0.3.5";
const PLAN_TABLE = "practice_plans";

function clean(value, max = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePlanForStorage(plan = {}, state = {}) {
  const drillLookup = new Map((state.drills || []).map((drill) => [drill.id, drill]));
  const blocks = (plan.blocks || []).map((block, index) => {
    const drill = drillLookup.get(block.drillId) || {};
    const score = window.BearDenHQ?.scoreDrill ? window.BearDenHQ.scoreDrill(drill, {
      ageGroup: document.getElementById("genAgeGroup")?.value || "10U",
      includeGoalie: document.getElementById("genIncludeGoalie")?.checked !== false,
      focus: plan.theme || "",
    }) : null;
    return {
      id: block.id || `block-${index + 1}`,
      drillId: block.drillId,
      drillName: drill.name || block.drillName || `Block ${index + 1}`,
      category: drill.category || "mixed",
      minutes: Number(block.minutes) || Number(drill.duration) || 8,
      label: block.label || "",
      objective: block.objective || drill.description || "",
      coachNote: block.coachNote || "",
      teachingMoment: block.teachingMoment || "",
      score: score ? { overall: score.overall, label: score.label, reason: score.reason } : null,
      drill: {
        name: drill.name || block.drillName || "Drill",
        description: drill.description || drill.instructions || "",
        coachingPoints: drill.coachingPoints || drill.coaching_points || drill.points || [],
        ageLevels: drill.ageLevels || drill.ageGroups || [],
        iceUsage: drill.iceUsage || drill.ice_type || "",
        difficulty: drill.difficulty || drill.level || "",
        diagram: drill.diagram || null,
      },
    };
  });

  return {
    id: plan.id || null,
    date: plan.date || new Date().toISOString().slice(0, 10),
    title: clean(plan.title, 140) || "Practice Plan",
    theme: clean(plan.theme, 140) || "Practice",
    progression: clean(plan.progression, 80),
    totalMinutes: Number(plan.totalMinutes) || blocks.reduce((sum, block) => sum + block.minutes, 0) || 60,
    notes: clean(plan.notes, 1000),
    coachBrain: plan.coachBrain || null,
    blocks,
    sharedAt: new Date().toISOString(),
    sharingVersion: SHARE_VERSION,
  };
}

async function getCurrentUserId(supabase) {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

async function savePracticeForSharing(plan, state, options = {}) {
  const supabase = await getSupabaseClient();
  const userId = await getCurrentUserId(supabase);
  if (!userId) throw new Error("Sign in before creating a share link.");

  const payload = normalizePlanForStorage(plan, state);
  const record = {
    user_id: userId,
    title: payload.title,
    data: payload,
    is_public: options.isPublic !== false,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (plan.id && /^[0-9a-f-]{32,36}$/i.test(String(plan.id))) {
    result = await supabase
      .from(PLAN_TABLE)
      .update(record)
      .eq("id", plan.id)
      .select("id, title, is_public, updated_at")
      .single();
  } else {
    result = await supabase
      .from(PLAN_TABLE)
      .insert(record)
      .select("id, title, is_public, updated_at")
      .single();
  }

  if (result.error) throw result.error;
  return { ...result.data, link: getPracticeShareLink(result.data.id) };
}

function getPracticeShareLink(planId) {
  const url = new URL("practice.html", window.location.origin);
  url.searchParams.set("id", planId);
  url.searchParams.set("public", "true");
  return url.toString();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand("copy");
  input.remove();
  return ok;
}

function getPlanDrills(state = {}, plan = {}) {
  const byId = new Map((state.drills || []).map((drill) => [drill.id, drill]));
  return (plan.blocks || []).map((block, index) => ({ block, drill: byId.get(block.drillId) || block.drill || { name: block.drillName || `Block ${index + 1}` }, index }));
}

async function exportPracticeToPdf(plan, state = {}) {
  const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
  const normalized = normalizePlanForStorage(plan, state);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  let y = margin;

  const line = (text, size = 10, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text || ""), pageWidth - margin * 2);
    lines.forEach((part) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(part, margin, y);
      y += size + 5;
    });
  };

  line(normalized.title, 18, { bold: true });
  line(`${normalized.date || "Practice"} • ${normalized.theme || "Practice"} • ${normalized.totalMinutes} minutes`, 10);
  if (normalized.coachBrain?.practiceScore) line(`Practice score: ${normalized.coachBrain.practiceScore}/10`, 10, { bold: true });
  if (normalized.notes) line(`Notes: ${normalized.notes}`, 9);
  y += 8;

  normalized.blocks.forEach((block, index) => {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }
    line(`${index + 1}. ${block.drillName} (${block.minutes} min)`, 13, { bold: true });
    const meta = [block.label, block.category, block.drill.iceUsage, block.drill.difficulty, block.score ? `${block.score.overall}/10 ${block.score.label}` : ""].filter(Boolean).join(" • ");
    if (meta) line(meta, 9);
    if (block.objective) line(`Objective: ${block.objective}`, 9);
    if (block.coachNote) line(`Coach note: ${block.coachNote}`, 9);
    if (block.teachingMoment) line(`Freeze moment: ${block.teachingMoment}`, 9);
    const points = Array.isArray(block.drill.coachingPoints) ? block.drill.coachingPoints : String(block.drill.coachingPoints || "").split(/[;\n]/).filter(Boolean);
    points.slice(0, 4).forEach((point) => line(`• ${point}`, 9));
    y += 8;
  });

  line(`Generated by ${window.state?.teamBranding?.productName || 'BenchBoss Coach HQ'} • Shared ${new Date().toLocaleDateString()}`, 8);
  const fileName = `${normalized.title || "practice-plan"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "practice-plan";
  doc.save(`${fileName}.pdf`);
}

function renderShareModal(result, plan, state) {
  closePracticeShareModal();
  const modal = document.createElement("div");
  modal.id = "practiceShareModal";
  modal.className = "share-modal-backdrop";
  modal.innerHTML = `
    <div class="share-modal-card" role="dialog" aria-modal="true" aria-label="Share practice">
      <div class="share-modal-head">
        <div>
          <div class="share-kicker">Practice saved</div>
          <h3>${escapeHtml(result.title || plan.title || "Practice Plan")}</h3>
        </div>
        <button class="share-close" type="button" data-share-close>×</button>
      </div>
      <div class="share-link-box">${escapeHtml(result.link)}</div>
      <div class="share-actions">
        <button class="btn primary" type="button" data-copy-link>Copy Link</button>
        <button class="btn" type="button" data-native-share>Share</button>
        <button class="btn" type="button" data-download-pdf>Download PDF</button>
      </div>
      <div class="share-help">Anyone with the link can view the public practice plan. Use PDF for the bench, locker room, or assistant coaches.</div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("[data-share-close]")?.addEventListener("click", closePracticeShareModal);
  modal.addEventListener("click", (event) => { if (event.target === modal) closePracticeShareModal(); });
  modal.querySelector("[data-copy-link]")?.addEventListener("click", async () => {
    await copyText(result.link);
    window.toast?.("Share link copied");
  });
  modal.querySelector("[data-native-share]")?.addEventListener("click", async () => {
    if (navigator.share) {
      await navigator.share({ title: result.title || plan.title || "Practice Plan", url: result.link });
    } else {
      await copyText(result.link);
      window.toast?.("Share link copied");
    }
  });
  modal.querySelector("[data-download-pdf]")?.addEventListener("click", () => exportPracticeToPdf(plan, state));
}

function closePracticeShareModal() {
  document.getElementById("practiceShareModal")?.remove();
}

async function shareCurrentPractice(plan, state) {
  if (!plan?.blocks?.length) throw new Error("Build a practice before sharing.");
  const result = await savePracticeForSharing(plan, state, { isPublic: true });
  if (plan && !plan.id) plan.id = result.id;
  await copyText(result.link).catch(() => false);
  renderShareModal(result, plan, state);
  return result;
}

function renderPublicPracticePlan(plan = {}) {
  const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const total = Number(plan.totalMinutes) || blocks.reduce((sum, block) => sum + (Number(block.minutes) || 0), 0);
  return `
    <section class="public-practice-card">
      <div class="public-header">
        <div>
          <div class="share-kicker">Shared practice plan</div>
          <h1>${escapeHtml(plan.title || "Practice Plan")}</h1>
          <p>${escapeHtml([plan.date, plan.theme, `${total} minutes`].filter(Boolean).join(" • "))}</p>
        </div>
        ${plan.coachBrain?.practiceScore ? `<div class="public-score">${escapeHtml(plan.coachBrain.practiceScore)}/10</div>` : ""}
      </div>
      ${plan.notes ? `<p class="public-notes">${escapeHtml(plan.notes)}</p>` : ""}
      <div class="public-blocks">
        ${blocks.map((block, index) => `
          <article class="public-block">
            <div class="public-block-num">${index + 1}</div>
            <div>
              <h2>${escapeHtml(block.drillName || block.drill?.name || "Drill")}</h2>
              <p class="public-meta">${escapeHtml([`${block.minutes || 0} min`, block.label, block.category, block.score ? `${block.score.overall}/10 ${block.score.label}` : ""].filter(Boolean).join(" • "))}</p>
              ${block.objective ? `<p><strong>Objective:</strong> ${escapeHtml(block.objective)}</p>` : ""}
              ${block.coachNote ? `<p><strong>Coach note:</strong> ${escapeHtml(block.coachNote)}</p>` : ""}
              ${block.teachingMoment ? `<p><strong>Freeze moment:</strong> ${escapeHtml(block.teachingMoment)}</p>` : ""}
            </div>
          </article>`).join("")}
      </div>
    </section>`;
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  SHARE_VERSION,
  normalizePlanForStorage,
  savePracticeForSharing,
  shareCurrentPractice,
  exportPracticeToPdf,
  getPracticeShareLink,
  renderPublicPracticePlan,
  closePracticeShareModal,
};
