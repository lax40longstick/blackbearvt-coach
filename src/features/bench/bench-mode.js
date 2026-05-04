// BenchBoss Coach HQ v0.7.0 — Bench Mode + Offline Rink Workflow
// -----------------------------------------------------------------------------
// A rink-first workflow layer for running a preloaded practice with unreliable
// connectivity, cold hands, glare, and limited time. Uses the existing on-ice
// overlay so it works inside the current app without a route rewrite.
(function benchBossBenchModeV070() {

const VERSION = '0.11.0';
const OFFLINE_PACK_KEY = 'benchboss_bench_offline_pack_v1';
const DEFAULT_SETTINGS = {
  highContrast: true,
  haptics: true,
  wakeLock: true,
  autoPlayDiagram: false,
  bigText: true,
};

const CATEGORY_LABELS = {
  skating: 'Skating', puck: 'Puck Handling', passing: 'Passing', shooting: 'Shooting', battle: 'Battles',
  breakout: 'Breakouts', dzone: 'D-Zone', ozone: 'O-Zone', pp: 'Power Play', pk: 'Penalty Kill', sag: 'Small Area',
  cond: 'Conditioning', goalie: 'Goalie', transition: 'Transition', compete: 'Compete', warmup: 'Warmup',
};

const CORE_CACHE_ASSETS = [
  './', './index.html', './app.html', './coach.html', './whiteboard.html', './bench.html', './bench-mode.html', './parent.html', './practice.html', './pricing.html', './auth.html', './onboarding.html', './account.html',
  './runtime-config.js', './manifest.json', './site.css', './site.js', './sw.js',
  './assets/benchboss-logo.svg', './assets/benchboss-mark.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './components/diagram.js', './components/editor.js', './components/rink.js', './src/features/whiteboard/coach-whiteboard.js', './data/drills.js', './data/elite-drills.js', './data/elite-drills-pack-2.js', './data/elite-drills-pack-3.js',
  './src/features/app/app-state.js', './src/features/roster/roster.js', './src/features/practice/practice-ui.js', './src/features/practice/practice-engine.js',
  './src/features/practice/animated-drill-viewer.js', './src/features/practice/drill-media-tabs.js', './src/features/practice/drill-scoring.js',
  './src/features/practice/ai-practice-builder.js', './src/features/practice/season-curriculum.js', './src/features/practice/team-development-tracking.js',
  './src/features/sharing/practice-sharing.js', './src/features/dashboard/coach-dashboard.js', './src/features/team-hub/team-hub.js',
  './src/features/team-hub/lineup-builder.js', './src/features/team-hub/production-team-hub.js', './src/features/team-hub/production-team-store.js',
  './src/features/branding/team-branding.js', './src/features/bench/bench-mode.js', './src/features/bench/bench-standalone.js', './src/lib/supabase.js', './src/lib/config.js', './src/lib/analytics.js', './src/lib/monitoring.js',
];

let timerInterval = null;
let timerStartValue = 0;
let timerStartedAt = 0;
let diagramPlayer = null;
let wakeLock = null;
let onlineStatusHandlerAttached = false;

function getState() { return window.state || {}; }
function saveLocal() {
  try {
    if (typeof window.saveState === 'function') window.saveState();
    else if (typeof window.save === 'function') window.save();
  } catch (error) { console.warn('Bench Mode save failed', error); }
}
function toast(message) { if (typeof window.toast === 'function') window.toast(message); else console.log(message); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function nowIso() { return new Date().toISOString(); }
function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
function getCategoryLabel(category) { return CATEGORY_LABELS[category] || category || 'Drill'; }
function isOnline() { return navigator.onLine !== false; }
function haptic(pattern = 25) {
  const settings = ensureBenchState(getState()).settings;
  if (!settings.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

function ensureBenchState(state = getState()) {
  state.benchMode = state.benchMode || {};
  state.benchMode.version = VERSION;
  state.benchMode.settings = { ...DEFAULT_SETTINGS, ...(state.benchMode.settings || {}) };
  if (!state.benchMode.notes || Array.isArray(state.benchMode.notes)) state.benchMode.notes = {};
  state.benchMode.recaps = state.benchMode.recaps || [];
  state.benchMode.quickNotes = state.benchMode.quickNotes || [];
  state.benchMode.presetsApplied = state.benchMode.presetsApplied || [];
  state.benchMode.adjustments = state.benchMode.adjustments || [];
  state.benchMode.quickNotes = state.benchMode.quickNotes || [];
  state.benchMode.lastPreload = state.benchMode.lastPreload || null;
  state.benchMode.lastIndex = Number.isInteger(state.benchMode.lastIndex) ? state.benchMode.lastIndex : 0;
  return state.benchMode;
}

function referencedDrillIds(plan) {
  return [...new Set((plan?.blocks || []).map(block => block.drillId).filter(Boolean))];
}
function findDrill(drillId, state = getState(), offlinePack = null) {
  return (state.drills || []).find(drill => drill.id === drillId)
    || (offlinePack?.drills || []).find(drill => drill.id === drillId)
    || null;
}
function planBlocks(plan) { return Array.isArray(plan?.blocks) ? plan.blocks : []; }
function totalMinutes(plan) { return planBlocks(plan).reduce((sum, block) => sum + (Number(block.minutes) || 0), 0); }
function getCurrentPlan(state = getState()) { return state.currentPlan || { blocks: [] }; }
function hasRunnablePlan(state = getState()) { return planBlocks(getCurrentPlan(state)).length > 0; }

function buildOfflinePack(state = getState()) {
  const plan = clone(getCurrentPlan(state));
  const ids = referencedDrillIds(plan);
  const referenced = ids.map(id => findDrill(id, state)).filter(Boolean);
  const fullLibrary = (state.drills || []).filter(drill => drill && drill.id);
  const seen = new Set();
  const drills = [];
  [...referenced, ...fullLibrary].forEach((drill) => {
    if (!drill?.id || seen.has(drill.id)) return;
    seen.add(drill.id);
    drills.push({ ...clone(drill), source: drill.source || 'benchboss' });
  });
  return {
    version: VERSION,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    appUrl: window.location.origin,
    plan,
    drills,
    roster: clone(state.roster || []),
    lines: clone(state.lines || {}),
    gameDay: clone(state.gameDay || {}),
    teamBranding: clone(state.teamBranding || {}),
    benchSettings: { ...DEFAULT_SETTINGS, ...(state.benchMode?.settings || {}) },
    stats: { blocks: planBlocks(plan).length, drills: drills.length, minutes: totalMinutes(plan) },
  };
}

function readOfflinePack() {
  try {
    const raw = localStorage.getItem(OFFLINE_PACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.plan) return null;
    return parsed;
  } catch (error) {
    console.warn('Could not read Bench Mode offline pack', error);
    return null;
  }
}
function writeOfflinePack(pack, state = getState()) {
  localStorage.setItem(OFFLINE_PACK_KEY, JSON.stringify(pack));
  ensureBenchState(state).lastPreload = {
    createdAt: pack.createdAt,
    title: pack.plan?.title || 'Untitled Practice',
    blocks: pack.stats.blocks,
    drills: pack.stats.drills,
    minutes: pack.stats.minutes,
  };
  saveLocal();
}

function getBenchPackageStatus(state = getState()) {
  const pack = readOfflinePack();
  if (!pack) return { ready: false, label: 'Not preloaded', detail: 'Preload this practice before you get to the rink.', pack: null };
  const ageMs = Date.now() - Date.parse(pack.createdAt || 0);
  const ageHours = Math.max(0, Math.round(ageMs / 36e5));
  const samePlan = pack.plan?.id && state.currentPlan?.id && pack.plan.id === state.currentPlan.id;
  const stale = ageHours > 72;
  return {
    ready: true,
    label: stale ? 'Preloaded but stale' : 'Offline ready',
    detail: `${pack.stats?.blocks || 0} blocks · ${pack.stats?.minutes || 0} min · ${ageHours < 1 ? 'just now' : `${ageHours}h ago`}${samePlan ? ' · current plan' : ''}`,
    stale,
    samePlan,
    pack,
  };
}

async function cacheBenchAssets(extraUrls = []) {
  const urls = [...new Set([...CORE_CACHE_ASSETS, ...extraUrls].filter(Boolean))];
  const results = { attempted: urls.length, cached: 0, failed: [] };
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try { navigator.serviceWorker.controller.postMessage({ type: 'BENCHBOSS_PRECACHE', urls }); } catch (_) {}
  }
  if (!('caches' in window)) return { ...results, skipped: true };
  const cache = await caches.open('benchboss-rink-cache-v7');
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) {
        await cache.put(url, response.clone());
        results.cached += 1;
      } else {
        results.failed.push(url);
      }
    } catch (_) {
      try {
        const match = await cache.match(url);
        if (match) results.cached += 1;
        else results.failed.push(url);
      } catch { results.failed.push(url); }
    }
  }));
  return results;
}

async function preloadPracticeForBench(state = getState()) {
  ensureBenchState(state);
  if (!hasRunnablePlan(state)) throw new Error('Build or load a practice before preloading Bench Mode.');
  const pack = buildOfflinePack(state);
  writeOfflinePack(pack, state);
  const cacheResult = await cacheBenchAssets();
  window.BearDenHQ?.trackEvent?.('bench_preloaded', { blocks: pack.stats.blocks, minutes: pack.stats.minutes, cached: cacheResult.cached });
  hydrateBenchWorkflowPanel(state);
  return { pack, cacheResult };
}

async function preloadPracticeForBenchUI() {
  try {
    const btn = document.getElementById('benchPreloadBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Preloading...'; }
    const { pack, cacheResult } = await preloadPracticeForBench(getState());
    toast(`Bench Mode ready: ${pack.stats.blocks} blocks cached`);
    if (cacheResult.failed.length) console.warn('Bench cache misses', cacheResult.failed);
  } catch (error) {
    toast(error.message || 'Bench preload failed');
  } finally {
    hydrateBenchWorkflowPanel(getState());
  }
}

function renderBenchWorkflowPanel(state = getState()) {
  ensureBenchState(state);
  const status = getBenchPackageStatus(state);
  const plan = getCurrentPlan(state);
  const blocks = planBlocks(plan);
  const settings = state.benchMode.settings;
  const lastRecap = (state.benchMode.recaps || [])[0];
  const readyClass = status.ready && !status.stale ? 'good' : (status.ready ? 'warn' : '');
  return `
    <div class="bench-shell" id="benchModePanel">
      <div class="bench-hero">
        <div>
          <div class="coach-kicker">Bench Mode v${VERSION}</div>
          <h2>Rink-ready practice control</h2>
          <p>Preload the plan, roster, lineup, drill diagrams, and app shell before practice. Then run it with giant controls, high contrast, quick swaps, and notes that still work when Wi-Fi dies.</p>
        </div>
        <div class="bench-status-card ${readyClass}">
          <strong>${esc(status.label)}</strong>
          <span>${esc(status.detail)}</span>
          <small>${isOnline() ? 'Online now' : 'Offline now'} · ${blocks.length ? `${blocks.length} current blocks` : 'No current plan'}</small>
        </div>
      </div>
      <div class="bench-metrics">
        <div><strong>${blocks.length}</strong><span>Blocks</span></div>
        <div><strong>${totalMinutes(plan)}</strong><span>Minutes</span></div>
        <div><strong>${status.pack?.drills?.length || 0}</strong><span>Cached drills</span></div>
        <div><strong>${(state.benchMode.recaps || []).length}</strong><span>Recaps</span></div>
      </div>
      <div class="bench-actions">
        <button class="btn primary full" id="benchPreloadBtn" onclick="window.BenchBossBench.preloadPracticeForBenchUI()">⬇ Preload Practice</button>
        <button class="btn full" onclick="window.BenchBossBench.startBenchModeUI()">▶ Start Bench Mode</button>
        <button class="btn full" onclick="window.BenchBossBench.startOfflinePackUI()" ${status.ready ? '' : 'disabled'}>📦 Run Offline Pack</button>
        <button class="btn full" onclick="window.BenchBossWhiteboard?.openFromCurrentDrill(window.state)">✎ Freeze + Annotate</button>
        <button class="btn full" onclick="window.BenchBossWhiteboard?.openBlank({ source: 'bench-mode', rink: 'full' })">▭ Open Whiteboard</button>
        <button class="btn full" onclick="window.BenchBossBench.openBenchChecklistUI()">✓ Rink Checklist</button>
      </div>
      <div class="bench-presets" aria-label="Quick practice adjustments">
        ${presetButtons().map(p => `<button type="button" onclick="window.BenchBossBench.applyBenchPresetUI('${p.id}')"><span>${p.icon}</span>${esc(p.label)}</button>`).join('')}
      </div>
      <div class="bench-settings-row">
        ${renderSettingToggle('highContrast', 'High contrast', settings.highContrast)}
        ${renderSettingToggle('bigText', 'Big text', settings.bigText)}
        ${renderSettingToggle('wakeLock', 'Keep screen awake', settings.wakeLock)}
        ${renderSettingToggle('haptics', 'Haptic buzz', settings.haptics)}
        ${renderSettingToggle('autoPlayDiagram', 'Auto-play diagrams', settings.autoPlayDiagram)}
      </div>
      ${lastRecap ? `<div class="bench-last-recap"><strong>Last recap:</strong> ${esc(lastRecap.title)} · ${esc(new Date(lastRecap.createdAt).toLocaleString())}</div>` : ''}
    </div>
  `;
}
function renderSettingToggle(key, label, checked) {
  return `<label><input type="checkbox" ${checked ? 'checked' : ''} onchange="window.BenchBossBench.updateBenchSettingUI('${key}', this.checked)"><span>${esc(label)}</span></label>`;
}
function hydrateBenchWorkflowPanel(state = getState()) {
  const mount = document.getElementById('benchModeMount');
  if (mount) mount.innerHTML = renderBenchWorkflowPanel(state);
}
function updateBenchSettingUI(key, value) {
  const bench = ensureBenchState(getState());
  bench.settings[key] = Boolean(value);
  saveLocal();
  hydrateBenchWorkflowPanel(getState());
  const overlay = document.getElementById('oiOverlay');
  if (overlay?.classList.contains('show')) applyOverlayClasses(overlay, bench.settings);
}

function presetButtons() {
  return [
    { id: 'half-ice', label: 'Half Ice', icon: '½' },
    { id: 'full-ice', label: 'Full Ice', icon: '↔' },
    { id: 'no-goalie', label: 'No Goalie', icon: '×G' },
    { id: 'low-numbers', label: 'Low Numbers', icon: '5' },
    { id: 'stations', label: 'Stations', icon: 'A/B' },
    { id: 'compete-more', label: 'Compete More', icon: '⚔' },
    { id: 'simplify', label: 'Simplify', icon: '↓' },
    { id: 'make-harder', label: 'Make Harder', icon: '↑' },
  ];
}
function normalizePreset(id) {
  const raw = String(id || '').trim().toLowerCase().replace(/_/g, '-');
  return ({ halfice: 'half-ice', fullice: 'full-ice', nogoalie: 'no-goalie', lownumbers: 'low-numbers', compete: 'compete-more', harder: 'make-harder' })[raw] || raw;
}
function presetLabel(id) {
  const normalized = normalizePreset(id);
  return presetButtons().find(p => p.id === normalized)?.label || normalized;
}

function getDrillText(drill) {
  return `${drill?.name || ''} ${drill?.category || ''} ${(drill?.tags || []).join(' ')} ${(drill?.skillFocus || []).join(' ')} ${drill?.iceUsage || ''} ${drill?.difficulty || ''}`.toLowerCase();
}
function drillMatchesPreset(drill, preset) {
  preset = normalizePreset(preset);
  const text = getDrillText(drill);
  if (preset === 'half-ice') return text.includes('half') || text.includes('quarter') || drill?.ice_type === 'quarter';
  if (preset === 'full-ice') return text.includes('full') || ['breakout','transition','cond'].includes(drill?.category);
  if (preset === 'no-goalie') return drill?.category !== 'goalie' && !drill?.goalie && !text.includes('goalie');
  if (preset === 'low-numbers') return ['puck','skating','passing','shooting','battle','sag'].includes(drill?.category) && !/10\+|12\+|full/.test(text);
  if (preset === 'stations') return text.includes('station') || text.includes('quarter') || ['skating','puck','shooting','passing'].includes(drill?.category);
  if (preset === 'compete-more') return ['battle','sag'].includes(drill?.category) || text.includes('compete') || text.includes('battle');
  if (preset === 'simplify') return drill?.difficulty !== 'advanced';
  if (preset === 'make-harder') return ['advanced','intermediate'].includes(drill?.difficulty) || ['battle','sag','transition','breakout'].includes(drill?.category);
  return true;
}
function presetNeedsSwap(drill, preset) {
  preset = normalizePreset(preset);
  const text = getDrillText(drill);
  if (!drill) return true;
  if (preset === 'no-goalie') return drill.category === 'goalie' || drill.goalie || text.includes('goalie');
  if (preset === 'half-ice') return text.includes('full ice') || drill.ice_type === 'full' || drill.iceUsage === 'full ice';
  if (preset === 'low-numbers') return /10\+|12\+|14\+|full line|5v5/.test(text);
  if (preset === 'simplify') return drill.difficulty === 'advanced';
  if (preset === 'make-harder') return drill.difficulty === 'beginner';
  return false;
}
function replacementScore(candidate, original, preset, usedIds) {
  preset = normalizePreset(preset);
  if (!candidate || usedIds.has(candidate.id)) return -999;
  if (!drillMatchesPreset(candidate, preset)) return -50;
  let score = Number(candidate.qualityScore || candidate.funRating || 5);
  if (candidate.category === original?.category) score += 7;
  const originalTags = new Set([...(original?.tags || []), ...(original?.skillFocus || [])]);
  [...(candidate.tags || []), ...(candidate.skillFocus || [])].forEach(tag => { if (originalTags.has(tag)) score += 2; });
  if (candidate.diagram) score += 3;
  if (preset === 'compete-more' && ['battle','sag'].includes(candidate.category)) score += 8;
  if (preset === 'stations' && ['skating','puck','shooting','passing'].includes(candidate.category)) score += 5;
  if (preset === 'no-goalie' && candidate.category !== 'goalie' && !candidate.goalie) score += 8;
  if (preset === 'half-ice' && /half|quarter/.test(getDrillText(candidate))) score += 6;
  return score;
}
function findReplacementDrill(original, preset, state = getState(), usedIds = new Set()) {
  return [...(state.drills || [])]
    .filter(candidate => candidate.id !== original?.id)
    .map(candidate => ({ candidate, score: replacementScore(candidate, original, preset, usedIds) }))
    .sort((a, b) => b.score - a.score)[0]?.candidate || null;
}
function adaptationNote(preset) {
  preset = normalizePreset(preset);
  return ({
    'half-ice': 'Half-ice adaptation: tighten spacing, shorten routes, and use boards as boundaries.',
    'full-ice': 'Full-ice adaptation: add transition distance and require players to finish through the far blue line.',
    'no-goalie': 'No-goalie adaptation: use tires, mini-nets, cone gates, or target zones instead of goalie shots.',
    'low-numbers': 'Low-number adaptation: shorten lines, run pairs, and keep shifts quick.',
    stations: 'Station adaptation: divide group into A/B/C stations with short rotations.',
    'compete-more': 'Compete boost: finish the block with a puck race or winner-stays rep.',
    simplify: 'Simplified: walk the route once, freeze the main read, then run at 70% speed.',
    'make-harder': 'Progression: add pressure, time limit, or score constraint.',
  })[preset] || 'Bench adjustment applied.';
}

function applyBenchPresetInternal(preset, { live = false } = {}) {
  preset = normalizePreset(preset);
  const state = getState();
  ensureBenchState(state);
  const plan = live && state.ui?.oiPlan ? state.ui.oiPlan : getCurrentPlan(state);
  if (!planBlocks(plan).length) throw new Error('No practice plan to adjust.');
  const usedIds = new Set(planBlocks(plan).map(block => block.drillId).filter(Boolean));
  let swaps = 0;
  plan.blocks = planBlocks(plan).map((block, index) => {
    const drill = findDrill(block.drillId, state);
    let next = { ...block };
    if (presetNeedsSwap(drill, preset)) {
      const replacement = findReplacementDrill(drill, preset, state, usedIds);
      if (replacement) {
        usedIds.delete(block.drillId);
        usedIds.add(replacement.id);
        next.drillId = replacement.id;
        next.label = next.label || block.label;
        next.benchSwapReason = `${presetLabel(preset)}: ${drill?.name || 'block'} → ${replacement.name}`;
        swaps += 1;
      }
    }
    const currentNote = next.benchAdjustment ? `${next.benchAdjustment}\n` : '';
    next.benchAdjustment = `${currentNote}${adaptationNote(preset)}`.trim();
    if (preset === 'stations') next.label = next.label || `Station ${String.fromCharCode(65 + (index % 3))}`;
    if (preset === 'compete-more' && index === planBlocks(plan).length - 1) next.minutes = Math.max(Number(next.minutes) || 0, 8);
    if (preset === 'low-numbers') next.minutes = Math.max(4, Math.min(Number(next.minutes) || 6, 8));
    return next;
  });
  state.benchMode.lastPreset = preset;
  state.benchMode.presetsApplied.unshift({ preset, label: presetLabel(preset), at: nowIso(), swaps });
  state.benchMode.presetsApplied = state.benchMode.presetsApplied.slice(0, 20);
  saveLocal();
  if (!live && typeof window.renderCurrentPlan === 'function') window.renderCurrentPlan();
  hydrateBenchWorkflowPanel(state);
  return { swaps, plan };
}
function applyBenchPresetUI(preset) {
  preset = normalizePreset(preset);
  try {
    const live = Boolean(document.getElementById('oiOverlay')?.classList.contains('show'));
    const result = applyBenchPresetInternal(preset, { live });
    if (live) renderBenchMode();
    toast(`${presetLabel(preset)} applied${result.swaps ? ` · ${result.swaps} swap${result.swaps > 1 ? 's' : ''}` : ''}`);
  } catch (error) { toast(error.message || 'Adjustment failed'); }
}

async function requestWakeLock() {
  const settings = ensureBenchState(getState()).settings;
  if (!settings.wakeLock) return;
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) { console.warn('Wake lock failed', error); }
}
function releaseWakeLock() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}
function applyOverlayClasses(overlay, settings) {
  overlay.classList.add('bench-mode-overlay');
  overlay.classList.toggle('rink-contrast', Boolean(settings.highContrast));
  overlay.classList.toggle('bench-big-text', Boolean(settings.bigText));
}
function clearDiagramPlayer() {
  if (diagramPlayer?.stop) diagramPlayer.stop();
  diagramPlayer = null;
}
function stopTimer() {
  const state = getState();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (state.ui) state.ui.oiTimerRunning = false;
  updateTimerButton();
}
function startTimer() {
  const state = getState();
  state.ui = state.ui || {};
  if (!state.ui.oiTimerRemaining) {
    const block = state.ui.oiPlan?.blocks?.[state.ui.oiIndex || 0];
    state.ui.oiTimerRemaining = (Number(block?.minutes) || 0) * 60;
  }
  timerStartValue = state.ui.oiTimerRemaining;
  timerStartedAt = Date.now();
  state.ui.oiTimerRunning = true;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
    state.ui.oiTimerRemaining = Math.max(0, timerStartValue - elapsed);
    const timeEl = document.getElementById('benchTimerTime');
    const display = document.getElementById('benchTimerDisplay');
    if (!timeEl) return stopTimer();
    timeEl.textContent = formatTime(state.ui.oiTimerRemaining);
    display?.classList.toggle('done', state.ui.oiTimerRemaining <= 0);
    if (state.ui.oiTimerRemaining <= 0) {
      haptic([250, 100, 250, 100, 500]);
      stopTimer();
    }
  }, 250);
  updateTimerButton();
}
function toggleTimer() {
  const state = getState();
  if (state.ui?.oiTimerRunning) stopTimer(); else startTimer();
}
function resetTimer() {
  stopTimer();
  const state = getState();
  const block = state.ui?.oiPlan?.blocks?.[state.ui?.oiIndex || 0];
  state.ui.oiTimerRemaining = (Number(block?.minutes) || 0) * 60;
  const timeEl = document.getElementById('benchTimerTime');
  if (timeEl) timeEl.textContent = formatTime(state.ui.oiTimerRemaining);
  document.getElementById('benchTimerDisplay')?.classList.remove('done');
  updateTimerButton();
}
function addMinute(delta = 60) {
  const state = getState();
  state.ui.oiTimerRemaining = Math.max(0, (Number(state.ui.oiTimerRemaining) || 0) + delta);
  if (state.ui.oiTimerRunning) timerStartValue += delta;
  const timeEl = document.getElementById('benchTimerTime');
  if (timeEl) timeEl.textContent = formatTime(state.ui.oiTimerRemaining);
  document.getElementById('benchTimerDisplay')?.classList.remove('done');
}
function updateTimerButton() {
  const btn = document.getElementById('benchTimerBtn') || document.getElementById('oiTimerBtn');
  if (btn) btn.textContent = getState().ui?.oiTimerRunning ? '⏸ Pause Timer' : '▶ Start Timer';
}

function startBenchMode(state = getState(), { useOfflinePack = false } = {}) {
  ensureBenchState(state);
  const pack = readOfflinePack();
  let plan = getCurrentPlan(state);
  if (useOfflinePack && pack?.plan) plan = pack.plan;
  if (!planBlocks(plan).length) throw new Error('Build, load, or preload a practice before starting Bench Mode.');
  state.ui = state.ui || {};
  state.ui.oiPlan = clone(plan);
  state.ui.oiIndex = Math.min(Math.max(Number(state.benchMode.lastIndex || 0), 0), Math.max(0, planBlocks(plan).length - 1));
  state.ui.oiTimerRunning = false;
  state.ui.oiTimerRemaining = 0;
  state.benchMode.activePackSource = useOfflinePack ? 'offline-pack' : 'current-plan';
  const overlay = document.getElementById('oiOverlay');
  if (!overlay) throw new Error('Bench overlay missing.');
  applyOverlayClasses(overlay, state.benchMode.settings);
  overlay.classList.add('show');
  attachOnlineHandlers();
  renderBenchMode();
  requestWakeLock();
  window.BearDenHQ?.trackEvent?.('bench_started', { source: state.benchMode.activePackSource, blocks: planBlocks(plan).length });
}
function startBenchModeUI() {
  try {
    window.BearDenHQ?.trackEvent?.('bench_mode_opened', { mode: 'online', source: 'app-panel' });
    startBenchMode(getState(), { useOfflinePack: false });
  }
  catch (error) { toast(error.message || 'Could not start Bench Mode'); }
}
function startOfflinePackUI() {
  try {
    window.BearDenHQ?.trackEvent?.('bench_mode_opened', { mode: 'offline-pack', source: 'app-panel' });
    startBenchMode(getState(), { useOfflinePack: true });
  }
  catch (error) { toast(error.message || 'Could not run offline pack'); }
}
function closeBenchMode() {
  const overlay = document.getElementById('oiOverlay');
  overlay?.classList.remove('show', 'bench-mode-overlay', 'rink-contrast', 'bench-big-text');
  clearDiagramPlayer();
  stopTimer();
  releaseWakeLock();
  saveLocal();
}

function currentBench() {
  const state = getState();
  const pack = readOfflinePack();
  const plan = state.ui?.oiPlan || getCurrentPlan(state);
  const blocks = planBlocks(plan);
  const index = Math.min(Math.max(Number(state.ui?.oiIndex || 0), 0), Math.max(0, blocks.length - 1));
  const block = blocks[index];
  const drill = findDrill(block?.drillId, state, pack);
  return { state, pack, plan, blocks, index, block, drill };
}
function renderPoints(drill, block) {
  const points = [
    ...(Array.isArray(drill?.coaching_points) ? drill.coaching_points : String(drill?.points || '').split('\n').filter(Boolean)),
    block?.teachingMoment ? `Freeze: ${block.teachingMoment}` : null,
    block?.benchAdjustment || null,
  ].filter(Boolean).slice(0, 6);
  if (!points.length) return '';
  return `<div class="bench-point-list">${points.map(point => `<div>${esc(point)}</div>`).join('')}</div>`;
}
function renderMistakes(drill) {
  const mistakes = Array.isArray(drill?.commonMistakes) ? drill.commonMistakes.slice(0, 3) : [];
  if (!mistakes.length) return '';
  return `<div class="bench-mini-card"><strong>Watch for</strong>${mistakes.map(m => `<span>${esc(m)}</span>`).join('')}</div>`;
}
function renderSequence(drill) {
  const sequence = drill?.diagram?.sequence || [];
  if (!sequence.length) return '';
  return `<div class="bench-sequence">${sequence.map((step, idx) => `<button type="button" onclick="window.BenchBossBench.playDiagramStepUI(${idx})"><b>${idx + 1}</b>${esc(step.label || `Step ${idx + 1}`)}</button>`).join('')}</div>`;
}
function getNoteForBlock(block) {
  const state = getState();
  return state.benchMode?.notes?.[block?.id || block?.drillId] || '';
}
function saveBenchNote(value) {
  const { state, block } = currentBench();
  ensureBenchState(state);
  const key = block?.id || block?.drillId;
  if (!key) return;
  state.benchMode.notes[key] = String(value || '').slice(0, 800);
  saveLocal();
}
function saveBenchNoteUI(value) { saveBenchNote(value); }

function renderBenchMode() {
  const { state, plan, blocks, index, block, drill } = currentBench();
  const total = blocks.length;
  const progress = document.getElementById('oiProgress');
  const fill = document.getElementById('oiProgressFill');
  const body = document.getElementById('oiBody');
  const nav = document.getElementById('oiNav');
  if (!progress || !fill || !body || !nav) return;

  if (index >= total || !block) return renderBenchComplete();
  state.benchMode.lastIndex = index;
  state.ui.oiTimerRemaining = state.ui.oiTimerRemaining || (Number(block.minutes) || 0) * 60;
  const category = getCategoryLabel(drill?.category);
  progress.innerHTML = `<span>BENCH ${index + 1}/${total}</span><span class="bench-online ${isOnline() ? 'online' : 'offline'}">${isOnline() ? 'ONLINE' : 'OFFLINE'}</span>`;
  fill.style.width = `${((index) / Math.max(total, 1)) * 100}%`;
  nav.style.display = 'grid';
  nav.innerHTML = `
    <button id="oiPrev" onclick="window.BenchBossBench.prevBenchBlockUI()" ${index === 0 ? 'disabled' : ''}>◀ Prev</button>
    <button class="center" id="benchTimerBtn" onclick="window.BenchBossBench.toggleTimerUI()">${state.ui.oiTimerRunning ? '⏸ Pause Timer' : '▶ Start Timer'}</button>
    <button id="oiNext" onclick="window.BenchBossBench.nextBenchBlockUI()">${index === total - 1 ? 'Finish ▶' : 'Next ▶'}</button>
  `;
  body.innerHTML = `
    <div class="bench-run-shell">
      <div class="bench-run-topline">
        <span>${esc(category)} · ${Number(block.minutes) || 0} min</span>
        <span>${esc(state.benchMode.activePackSource === 'offline-pack' ? 'Offline pack' : 'Current plan')}</span>
      </div>
      <h1 class="bench-run-title">${esc(drill?.name || 'Missing drill')}</h1>
      ${block.label ? `<div class="bench-run-label">${esc(block.label)}</div>` : ''}
      ${block.benchSwapReason ? `<div class="bench-adjust-note">${esc(block.benchSwapReason)}</div>` : ''}
      <div class="bench-timer" id="benchTimerDisplay">
        <button type="button" onclick="window.BenchBossBench.addMinuteUI(-60)">-1</button>
        <div id="benchTimerTime">${formatTime(state.ui.oiTimerRemaining)}</div>
        <button type="button" onclick="window.BenchBossBench.addMinuteUI(60)">+1</button>
        <button type="button" onclick="window.BenchBossBench.resetTimerUI()">Reset</button>
      </div>
      <div class="bench-live-actions">
        <button onclick="window.BenchBossBench.swapCurrentDrillUI()">Swap Drill</button>
        <button onclick="window.BenchBossBench.applyBenchPresetUI('half-ice')">Half Ice</button>
        <button onclick="window.BenchBossBench.applyBenchPresetUI('no-goalie')">No Goalie</button>
        <button onclick="window.BenchBossBench.applyBenchPresetUI('simplify')">Simplify</button>
      </div>
      ${drill?.diagram ? `<div class="bench-diagram-wrap"><canvas id="benchDiagramCanvas" class="bench-diagram"></canvas><button class="bench-play" id="benchPlayDiagramBtn" onclick="window.BenchBossBench.toggleDiagramUI()">▶ Play Diagram</button></div>` : ''}
      ${renderSequence(drill)}
      <div class="bench-card-grid">
        <div class="bench-card"><strong>Setup + Flow</strong><p>${esc(drill?.description || drill?.instructions || 'Run clean reps, coach one detail, then reset fast.')}</p></div>
        <div class="bench-card"><strong>Coach cues</strong>${renderPoints(drill, block)}</div>
        ${renderMistakes(drill)}
      </div>
      <label class="bench-note-box"><span>Quick note for recap</span><textarea id="benchQuickNote" placeholder="Example: Players rushed the support pass. Repeat next week." oninput="window.BenchBossBench.saveBenchNoteUI(this.value)">${esc(getNoteForBlock(block))}</textarea></label>
    </div>
  `;
  if (drill?.diagram && window.BearDenHQ?.drawDrillDiagram) {
    try { window.BearDenHQ.drawDrillDiagram('benchDiagramCanvas', drill); } catch (error) { console.warn(error); }
    if (state.benchMode.settings.autoPlayDiagram) setTimeout(() => toggleDiagram(), 250);
  }
  updateTimerButton();
}

function toggleDiagram() {
  const { drill } = currentBench();
  const btn = document.getElementById('benchPlayDiagramBtn');
  if (!drill?.diagram || !window.BearDenHQ?.playDrillDiagram) return;
  if (diagramPlayer?.isPlaying?.()) {
    diagramPlayer.pause?.();
    if (btn) btn.textContent = '▶ Resume Diagram';
    return;
  }
  if (diagramPlayer) {
    diagramPlayer.resume?.();
    if (btn) btn.textContent = '⏸ Pause Diagram';
    return;
  }
  diagramPlayer = window.BearDenHQ.playDrillDiagram('benchDiagramCanvas', drill, {
    onStateChange: status => { if (btn) btn.textContent = status === 'paused' ? '▶ Resume Diagram' : '⏸ Pause Diagram'; },
    onComplete: () => { if (btn) btn.textContent = '▶ Play Diagram'; diagramPlayer = null; },
  });
  if (btn) btn.textContent = '⏸ Pause Diagram';
}
function toggleDiagramUI() { toggleDiagram(); }
function playDiagramStepUI(stepIndex) {
  const { drill } = currentBench();
  if (!drill?.diagram || !window.BearDenHQ?.drawDrillDiagram) return;
  clearDiagramPlayer();
  // The current diagram renderer supports sequence playback, not single-step drawing.
  // We re-draw the diagram and use the step label as the freeze-point cue.
  window.BearDenHQ.drawDrillDiagram('benchDiagramCanvas', drill);
  const step = drill.diagram.sequence?.[stepIndex];
  if (step) toast(`Freeze: ${step.label}`);
}

function prevBenchBlockUI() {
  const state = getState();
  if ((state.ui?.oiIndex || 0) <= 0) return;
  clearDiagramPlayer();
  stopTimer();
  state.ui.oiIndex -= 1;
  state.ui.oiTimerRemaining = 0;
  haptic(20);
  renderBenchMode();
}
function nextBenchBlockUI() {
  const state = getState();
  clearDiagramPlayer();
  stopTimer();
  state.ui.oiIndex = (state.ui?.oiIndex || 0) + 1;
  state.ui.oiTimerRemaining = 0;
  haptic(20);
  const total = state.ui?.oiPlan?.blocks?.length || 0;
  if (state.ui.oiIndex >= total) renderBenchComplete(); else renderBenchMode();
}
function toggleTimerUI() { toggleTimer(); }
function resetTimerUI() { resetTimer(); }
function addMinuteUI(delta = 60) { addMinute(Number(delta) || 0); }

function swapCurrentDrillUI() {
  try {
    const { state, block, drill } = currentBench();
    const plan = state.ui?.oiPlan || getCurrentPlan(state);
    const used = new Set(planBlocks(plan).map(b => b.drillId));
    const replacement = findReplacementDrill(drill, state.benchMode?.lastPreset || 'half-ice', state, used)
      || findReplacementDrill(drill, 'compete-more', state, used)
      || findReplacementDrill(drill, 'simplify', state, used);
    if (!replacement || !block) throw new Error('No suitable replacement found.');
    const originalId = drill?.id || block.drillId || null;
    block.benchSwapReason = `Live swap: ${drill?.name || 'drill'} → ${replacement.name}`;
    block.drillId = replacement.id;
    window.BearDenHQ?.trackEvent?.('drill_swapped', {
      source: 'bench-mode',
      fromDrillId: originalId,
      toDrillId: replacement.id,
      preset: state.benchMode?.lastPreset || 'live-swap',
      blockIndex: state.ui?.oiIndex || 0,
    });
    saveLocal();
    renderBenchMode();
    toast(`Swapped to ${replacement.name}`);
  } catch (error) { toast(error.message || 'Swap failed'); }
}

function renderBenchComplete() {
  const { state, plan, blocks } = currentBench();
  const notes = collectBenchNotes(plan, state);
  const progress = document.getElementById('oiProgress');
  const fill = document.getElementById('oiProgressFill');
  const body = document.getElementById('oiBody');
  const nav = document.getElementById('oiNav');
  if (progress) progress.textContent = 'PRACTICE COMPLETE';
  if (fill) fill.style.width = '100%';
  if (nav) nav.style.display = 'none';
  if (body) body.innerHTML = `
    <div class="bench-complete">
      <div class="big-check">✓</div>
      <h2>Good practice</h2>
      <p>${blocks.length} blocks · ${totalMinutes(plan)} minutes · ${notes.length} notes</p>
      <textarea id="benchFinalNote" placeholder="Final coach recap for parents/staff...">${esc(buildDefaultRecap(plan, notes))}</textarea>
      <div class="bench-complete-actions">
        <button class="btn primary" onclick="window.BenchBossBench.saveBenchRecapUI()">Save Recap</button>
        <button class="btn" onclick="window.BenchBossBench.publishBenchRecapUI()">Publish Recap</button>
        <button class="btn" onclick="window.BenchBossBench.closeBenchModeUI()">Close</button>
      </div>
    </div>
  `;
}
function collectBenchNotes(plan, state = getState()) {
  return planBlocks(plan).map((block, index) => {
    const note = state.benchMode?.notes?.[block.id || block.drillId];
    if (!note) return null;
    const drill = findDrill(block.drillId, state);
    return { index: index + 1, drillName: drill?.name || block.label || 'Drill', note };
  }).filter(Boolean);
}
function buildDefaultRecap(plan, notes) {
  const title = plan?.title || 'Practice';
  const theme = plan?.theme ? ` Focus: ${plan.theme}.` : '';
  const noteText = notes.length ? `\n\nCoach notes:\n${notes.map(n => `- ${n.drillName}: ${n.note}`).join('\n')}` : '';
  return `${title} complete.${theme} We worked through ${planBlocks(plan).length} blocks and ${totalMinutes(plan)} minutes.${noteText}`;
}
function buildRecapObject() {
  const { state, plan } = currentBench();
  const body = document.getElementById('benchFinalNote')?.value?.trim() || buildDefaultRecap(plan, collectBenchNotes(plan, state));
  return {
    id: crypto.randomUUID(),
    title: `${plan?.title || 'Practice'} Recap`,
    body,
    planTitle: plan?.title || '',
    practiceDate: plan?.date || new Date().toISOString().slice(0, 10),
    createdAt: nowIso(),
    source: 'bench-mode',
    notes: collectBenchNotes(plan, state),
    blocks: planBlocks(plan).map(block => ({ ...block })),
  };
}
function saveBenchRecap(recap = buildRecapObject()) {
  const state = getState();
  ensureBenchState(state).recaps.unshift(recap);
  state.benchMode.recaps = state.benchMode.recaps.slice(0, 25);
  window.BearDenHQ?.trackEvent?.('practice_completed', {
    source: 'bench-mode',
    planTitle: recap.planTitle || recap.title || '',
    blocks: recap.blocks?.length || 0,
    notes: recap.notes?.length || 0,
  });
  saveLocal();
  hydrateBenchWorkflowPanel(state);
  return recap;
}
function saveBenchRecapUI() {
  const recap = saveBenchRecap();
  toast(`Recap saved: ${recap.title}`);
}
async function publishBenchRecapUI() {
  const recap = saveBenchRecap();
  try {
    if (!isOnline()) throw new Error('Offline now. Recap saved locally; publish when online.');
    const store = window.BenchBossProductionStore;
    if (!store?.getProductionTeamContext) throw new Error('Production Team Hub is not loaded.');
    const ctx = await store.getProductionTeamContext();
    if (!ctx?.ready) throw new Error(ctx?.error || 'Supabase team context is not ready.');
    if (!ctx.canCoach && !ctx.canManage) throw new Error('Only coaches/managers can publish recaps.');
    const row = {
      organization_id: ctx.organization.id,
      team_id: ctx.team.id,
      title: recap.title,
      practice_date: recap.practiceDate,
      status: 'published',
      visibility: 'team',
      data: { recap, publishedFrom: 'bench-mode', publishedAt: nowIso() },
      published_at: nowIso(),
      created_by: ctx.user?.id || null,
    };
    const { error } = await ctx.supabase.from('team_practices').insert(row);
    if (error) throw error;
    toast('Recap published to parent portal');
    window.BearDenHQ?.trackEvent?.('bench_recap_published', { notes: recap.notes.length });
  } catch (error) {
    toast(error.message || 'Recap saved locally, but publish failed');
  }
}

function openBenchChecklistUI() {
  const checklist = [
    'Phone/tablet battery above 50%',
    'Practice preloaded and Offline Ready',
    'Lineup/roster synced before leaving home',
    'Brightness up / low-power mode off if possible',
    'Coach notes will save locally if rink Wi-Fi drops',
  ];
  alert(`BenchBoss Rink Checklist\n\n${checklist.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`);
}
function attachOnlineHandlers() {
  if (onlineStatusHandlerAttached) return;
  onlineStatusHandlerAttached = true;
  const update = () => {
    hydrateBenchWorkflowPanel(getState());
    if (document.getElementById('oiOverlay')?.classList.contains('show')) renderBenchMode();
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

const PRESET_LABELS = Object.fromEntries(presetButtons().map(p => [p.id, p.label]));

function describePlanChanges(beforePlan, afterPlan, state = getState()) {
  const beforeBlocks = planBlocks(beforePlan);
  const afterBlocks = planBlocks(afterPlan);
  return afterBlocks.map((block, index) => {
    const before = beforeBlocks[index];
    if (!before || before.drillId === block.drillId) return null;
    const from = findDrill(before.drillId, state)?.name || 'Previous drill';
    const to = findDrill(block.drillId, state)?.name || 'Replacement drill';
    return { index, from, to, blockId: block.id || null };
  }).filter(Boolean);
}

function applyBenchPresetCompat(arg1, arg2, arg3, arg4) {
  if (typeof arg1 === 'string') return applyBenchPresetInternal(normalizePreset(arg1), arg2 || {});
  const plan = arg1;
  const stateArg = arg2 || getState();
  const preset = normalizePreset(arg3 || 'half-ice');
  if (!plan || !Array.isArray(plan.blocks)) return { plan, changes: [] };
  const before = clone(plan);
  const originalPlan = stateArg.currentPlan;
  stateArg.currentPlan = plan;
  const result = applyBenchPresetInternal(preset, { live: Boolean(arg4?.live) });
  const changes = describePlanChanges(before, stateArg.currentPlan, stateArg);
  if (originalPlan !== plan && !arg4?.replaceCurrent) stateArg.currentPlan = originalPlan;
  return { plan: result.plan || plan, changes };
}

function applyPresetToBenchPlan(stateArg = getState(), preset = 'half-ice', currentOnly = false) {
  preset = normalizePreset(preset);
  const targetPlan = currentOnly && stateArg.ui?.oiPlan ? stateArg.ui.oiPlan : (stateArg.ui?.oiPlan || stateArg.currentPlan);
  const before = clone(targetPlan);
  if (preset === 'swap_current') {
    const index = Math.max(0, Number(stateArg.ui?.oiIndex || 0));
    const block = targetPlan.blocks?.[index];
    const drill = findDrill(block?.drillId, stateArg);
    const used = new Set(targetPlan.blocks.map(b => b.drillId).filter(Boolean));
    const replacement = findReplacementDrill(drill, 'compete-more', stateArg, used) || findReplacementDrill(drill, 'simplify', stateArg, used);
    if (block && replacement) {
      block.benchSwapReason = `Live swap: ${drill?.name || 'drill'} -> ${replacement.name}`;
      block.drillId = replacement.id;
    }
  } else {
    const originalPlan = stateArg.currentPlan;
    stateArg.currentPlan = targetPlan;
    applyBenchPresetInternal(preset, { live: Boolean(stateArg.ui?.oiPlan) });
    if (originalPlan !== targetPlan) stateArg.currentPlan = originalPlan;
  }
  const changes = describePlanChanges(before, targetPlan, stateArg);
  if (changes.length) {
    window.BearDenHQ?.trackEvent?.('drill_swapped', {
      source: 'bench-preset',
      preset,
      swaps: changes.length,
      currentOnly: Boolean(currentOnly),
    });
  }
  return { plan: targetPlan, changes };
}

function getOfflineStatus(stateArg = getState()) {
  const status = getBenchPackageStatus(stateArg);
  return {
    ready: Boolean(status.ready && !status.stale),
    stale: Boolean(status.stale),
    online: isOnline(),
    preloadedAt: status.pack?.createdAt || null,
    planTitle: status.pack?.plan?.title || '',
    blockCount: status.pack?.stats?.blocks || 0,
    drillCount: status.pack?.stats?.drills || 0,
    minutes: status.pack?.stats?.minutes || 0,
    detail: status.detail,
  };
}

async function preloadCurrentPracticeForOffline(stateArg = getState()) {
  const result = await preloadPracticeForBench(stateArg);
  return { bundle: result.pack, cacheResult: result.cacheResult };
}

function hasOfflinePractice() { return Boolean(readOfflinePack()?.plan?.blocks?.length); }

function loadOfflinePracticeIntoState(stateArg = getState()) {
  const pack = readOfflinePack();
  if (!pack?.plan) throw new Error('No preloaded offline practice found on this device.');
  const knownIds = new Set((stateArg.drills || []).map(d => d.id));
  stateArg.drills = [...(stateArg.drills || []), ...(pack.drills || []).filter(d => !knownIds.has(d.id))];
  stateArg.currentPlan = clone(pack.plan);
  if (pack.roster?.length && (!stateArg.roster || !stateArg.roster.length)) stateArg.roster = clone(pack.roster);
  stateArg.benchMode = ensureBenchState(stateArg);
  stateArg.benchMode.loadedOfflinePackAt = nowIso();
  saveLocal();
  return pack;
}

function clearOfflinePractice(stateArg = getState()) {
  localStorage.removeItem(OFFLINE_PACK_KEY);
  ensureBenchState(stateArg).lastPreload = null;
  saveLocal();
}

function addQuickNote(stateArg = getState(), note = '', block = null) {
  ensureBenchState(stateArg);
  const key = block?.id || block?.drillId || `note-${Date.now()}`;
  stateArg.benchMode.notes[key] = String(note || "").slice(0, 800);
  stateArg.benchMode.quickNotes.unshift({ key, note: stateArg.benchMode.notes[key], at: nowIso(), drillId: block?.drillId || null });
  stateArg.benchMode.quickNotes = stateArg.benchMode.quickNotes.slice(0, 50);
  saveLocal();
  return { key, note: stateArg.benchMode.notes[key] };
}

function buildRecapText(recap = {}) {
  const lines = [recap.title || 'BenchBoss Practice Recap', recap.body || recap.notes || 'Practice complete.'];
  if (Array.isArray(recap.quickNotes) && recap.quickNotes.length) {
    lines.push('', 'Coach notes:');
    recap.quickNotes.forEach(item => lines.push(`- ${item.drillName || 'Drill'}: ${item.note}`));
  }
  return lines.filter(Boolean).join('\n');
}

function saveBenchRecapCompat(stateArg = getState(), opts = {}) {
  const plan = stateArg.ui?.oiPlan || stateArg.currentPlan || { blocks: [] };
  const quickNotes = collectBenchNotes(plan, stateArg);
  const body = opts.notes || buildDefaultRecap(plan, quickNotes);
  const recap = {
    id: crypto.randomUUID(),
    title: `${plan.title || 'Practice'} Recap`,
    body,
    notes: opts.notes || '',
    rating: opts.rating || '',
    focus: opts.focus || plan.theme || '',
    planTitle: plan.title || '',
    practiceDate: plan.date || new Date().toISOString().slice(0, 10),
    quickNotes,
    shareText: buildRecapText({ title: `${plan.title || 'Practice'} Recap`, body, quickNotes }),
    createdAt: nowIso(),
    source: 'bench-mode',
  };
  ensureBenchState(stateArg).recaps.unshift(recap);
  stateArg.benchMode.recaps = stateArg.benchMode.recaps.slice(0, 25);
  stateArg.benchMode.lastRecap = recap;
  saveLocal();
  hydrateBenchWorkflowPanel(stateArg);
  return recap;
}

// Rink-safe global hooks. Existing practice-ui.js startOnIceMode delegates here.
window.BenchBossBench = {
  VERSION,
  ensureBenchState,
  renderBenchWorkflowPanel,
  hydrateBenchWorkflowPanel,
  getBenchPackageStatus,
  preloadPracticeForBench,
  preloadPracticeForBenchUI,
  startBenchMode,
  startBenchModeUI,
  startOfflinePackUI,
  closeBenchMode,
  closeBenchModeUI: closeBenchMode,
  updateBenchSettingUI,
  applyBenchPreset: applyBenchPresetCompat,
  applyPresetToBenchPlan,
  PRESET_LABELS,
  normalizePreset,
  getOfflineStatus,
  preloadCurrentPracticeForOffline,
  hasOfflinePractice,
  loadOfflinePracticeIntoState,
  clearOfflinePractice,
  addQuickNote,
  saveBenchRecap: saveBenchRecapCompat,
  buildRecapText,
  applyBenchPresetUI,
  toggleTimerUI,
  resetTimerUI,
  addMinuteUI,
  prevBenchBlockUI,
  nextBenchBlockUI,
  toggleDiagramUI,
  playDiagramStepUI,
  swapCurrentDrillUI,
  saveBenchNoteUI,
  saveBenchRecapUI,
  publishBenchRecapUI,
  openBenchChecklistUI,
};

window.BearDenHQ = window.BearDenHQ || {};
window.BearDenHQ.ensureBenchState = ensureBenchState;
window.BearDenHQ.hydrateBenchWorkflowPanel = hydrateBenchWorkflowPanel;
window.BearDenHQ.preloadPracticeForBench = preloadPracticeForBench;

window.addEventListener('DOMContentLoaded', () => {
  ensureBenchState(getState());
  hydrateBenchWorkflowPanel(getState());
  attachOnlineHandlers();
});

})();
