const VIDEO_HOSTS = new Set(["www.youtube.com", "youtube.com", "youtu.be", "player.vimeo.com", "vimeo.com"]);

function safe(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

function normalizeVideoUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!VIDEO_HOSTS.has(parsed.hostname)) return "";
    if (parsed.hostname === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.replace(/^\//, "")}`;
    if (parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (parsed.hostname === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
    return raw;
  } catch {
    return "";
  }
}

function pointsFor(drill) {
  const raw = drill?.coachingPoints || drill?.coaching_points || drill?.points || [];
  return Array.isArray(raw) ? raw : String(raw || "").split(/[\n;]/).map((v) => v.trim()).filter(Boolean);
}

export function getDrillVideoEmbedUrl(drill) {
  return normalizeVideoUrl(drill?.videoUrl || drill?.video_url || drill?.demoVideoUrl || drill?.demo_video_url || "");
}

export function renderDrillMediaTabs(drill, options = {}) {
  const id = `dmt_${Math.random().toString(36).slice(2, 8)}`;
  const embed = getDrillVideoEmbedUrl(drill);
  const points = pointsFor(drill);
  const compact = Boolean(options.compact);
  return `
    <div class="drill-media-tabs ${compact ? "compact" : ""}" id="${id}" data-drill-media-tabs>
      <div class="dmt-tabs" role="tablist">
        <button type="button" class="dmt-tab active" data-tab="animation">Animation</button>
        <button type="button" class="dmt-tab" data-tab="video">Video</button>
        <button type="button" class="dmt-tab" data-tab="coaching">Coaching Points</button>
      </div>
      <div class="dmt-panel active" data-panel="animation"><div id="${id}_animation"></div></div>
      <div class="dmt-panel" data-panel="video">
        ${embed ? `<iframe class="dmt-video" src="${safe(embed)}" title="${safe(drill?.name || "Drill video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` : `<div class="empty-state">No demo video added yet. Add a YouTube or Vimeo URL to this drill.</div>`}
      </div>
      <div class="dmt-panel" data-panel="coaching">
        <div class="adv-coach-card">
          <div class="adv-coach-title">${safe(drill?.name || "Drill")} coaching card</div>
          ${drill?.description ? `<p>${safe(drill.description)}</p>` : ""}
          ${points.length ? points.slice(0, 8).map((p) => `<div class="adv-coach-point">• ${safe(p)}</div>`).join("") : `<div class="empty-state">No coaching points added yet.</div>`}
          ${drill?.commonMistakes ? `<div class="adv-coach-title">Common mistakes</div><p>${safe(drill.commonMistakes)}</p>` : ""}
          ${drill?.progressions ? `<div class="adv-coach-title">Progressions</div><p>${safe(drill.progressions)}</p>` : ""}
        </div>
      </div>
    </div>`;
}

export function hydrateDrillMediaTabs(root = document, state = {}) {
  root.querySelectorAll("[data-drill-media-tabs]").forEach((shell) => {
    if (shell.dataset.hydrated === "true") return;
    shell.dataset.hydrated = "true";
    shell.addEventListener("click", (event) => {
      const tab = event.target.closest(".dmt-tab");
      if (!tab) return;
      const key = tab.dataset.tab;
      shell.querySelectorAll(".dmt-tab").forEach((button) => button.classList.toggle("active", button === tab));
      shell.querySelectorAll(".dmt-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === key));
    });
  });
}

window.BearDenHQ = { ...(window.BearDenHQ || {}), renderDrillMediaTabs, hydrateDrillMediaTabs, getDrillVideoEmbedUrl };
