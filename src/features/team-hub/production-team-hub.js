// BenchBoss Coach HQ v0.6.0 — Production Team Hub UI
// Adds Supabase-backed sync controls, invite links, parent portal publishing,
// persistent branding, source links, and manager-ready production status.

import {
  getProductionTeamContext,
  loadProductionTeamHubData,
  pullRosterFromSupabaseIntoState,
  syncRosterToSupabase,
  saveLineupToSupabase,
  publishCurrentPracticeToSupabase,
  saveTeamBrandingToSupabase,
  uploadTeamLogoToSupabase,
  loadTeamBrandingFromSupabase,
  saveTeamSourceLinks,
  createTeamInvite,
  acceptTeamInvite,
  summarizeProductionData,
} from './production-team-store.js';

const VERSION = '0.6.0';
let lastProductionData = null;
let lastContext = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(message) { if (typeof window.toast === 'function') window.toast(message); else console.log(message); }
function saveLocal() { if (typeof window.saveState === 'function') window.saveState(); else if (typeof window.save === 'function') window.save(); }
function parentPortalUrl(ctx = lastContext) {
  const teamId = ctx?.team?.id || '';
  const suffix = teamId ? `?team=${encodeURIComponent(teamId)}` : '';
  return `${window.location.origin}/parent.html${suffix}`;
}

function statusPill(ctx, data) {
  if (!ctx?.status?.ready) return `<span class="prod-pill warn">Missing Config</span>`;
  if (!ctx.ready) return `<span class="prod-pill warn">Needs Workspace</span>`;
  if (!data) return `<span class="prod-pill">Connected</span>`;
  return `<span class="prod-pill good">Production Ready</span>`;
}

function renderSummaryCards(data) {
  const summary = summarizeProductionData(data || {});
  const items = [
    ['Players', summary.players],
    ['Staff', summary.staff],
    ['Published Practices', summary.practices],
    ['Lineups', summary.lineups],
    ['Sources', summary.sources],
    ['GameSheet Runs', summary.imports],
  ];
  return `<div class="prod-metrics">${items.map(([label, value]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`;
}

function sourceValue(type, externalId = null) {
  const match = (lastProductionData?.sources || []).find(src => src.source_type === type && (!externalId || src.external_id === externalId));
  return match?.url || '';
}

function renderProductionHubHtml(ctx = lastContext, data = lastProductionData) {
  const teamName = ctx?.team?.name || 'No team selected';
  const orgName = ctx?.organization?.name || 'No organization selected';
  const role = ctx?.role || 'signed out';
  const status = ctx?.ready ? 'Supabase team context is active.' : (ctx?.error || ctx?.status?.message || 'Production context not ready.');
  const canManage = Boolean(ctx?.canManage);
  const canCoach = Boolean(ctx?.canCoach);
  const parentUrl = parentPortalUrl(ctx);
  const inviteDisabled = canManage ? '' : 'disabled';
  const coachDisabled = canCoach ? '' : 'disabled';
  const manageDisabled = canManage ? '' : 'disabled';

  return `
    <div class="prod-shell">
      <div class="prod-hero">
        <div>
          <div class="coach-kicker">Production Team Hub v${VERSION}</div>
          <h2>Make this team data live across devices</h2>
          <p>${esc(status)} This layer stores roster, lineups, published practices, branding, source links, and parent access in Supabase.</p>
        </div>
        <div class="prod-status-card">
          ${statusPill(ctx, data)}
          <strong>${esc(teamName)}</strong>
          <span>${esc(orgName)} · ${esc(role)}</span>
        </div>
      </div>

      ${renderSummaryCards(data)}

      <div class="coach-grid-2">
        <div class="panel coach-panel prod-panel">
          <div class="panel-title"><span>Production Sync</span><span class="count">Supabase</span></div>
          <p class="settings-note">Use these once your v0.6.0 SQL migration is applied. Pull first if you already have production data.</p>
          <div class="prod-actions">
            <button class="btn full" onclick="pullProductionTeamDataUI()">Pull Team Data</button>
            <button class="btn primary full" ${manageDisabled} onclick="pushRosterProductionUI()">Push Roster</button>
            <button class="btn full" ${coachDisabled} onclick="publishLineupProductionUI()">Publish Lineup</button>
            <button class="btn full" ${coachDisabled} onclick="publishPracticeProductionUI()">Publish Practice</button>
            <button class="btn full" ${manageDisabled} onclick="saveBrandingProductionUI()">Save Branding</button>
          </div>
          <div class="prod-link-row"><span>Parent Portal</span><button class="btn small" onclick="copyParentPortalLinkUI()">Copy Link</button></div>
          <code class="prod-code">${esc(parentUrl)}</code>
        </div>

        <div class="panel coach-panel prod-panel">
          <div class="panel-title"><span>Invite Users</span><span class="count">Roles</span></div>
          <div class="field-row cols-2">
            <div><label>Email</label><input id="prodInviteEmail" type="email" placeholder="parent@email.com"></div>
            <div><label>Role</label><select id="prodInviteRole"><option value="parent">Parent</option><option value="viewer">Viewer</option><option value="manager">Manager</option><option value="assistant_coach">Assistant Coach</option><option value="player">Player</option></select></div>
          </div>
          <button class="btn primary full" ${inviteDisabled} onclick="createProductionInviteUI()">Create Invite Link</button>
          <div id="prodInviteResult" class="prod-invite-result"></div>
          <p class="settings-note">Parents get view-only access to published lineups, published practices, roster, and stats. Managers can sync roster/source data.</p>
        </div>
      </div>

      <div class="panel coach-panel prod-panel">
        <div class="panel-title"><span>External Source Links</span><span class="count">SportsEngine + GameSheet</span></div>
        <div class="field"><label>GameSheet public stats URL</label><input id="prodGameSheetUrl" placeholder="https://gamesheetstats.com/seasons/..." value="${esc(sourceValue('gamesheet', 'primary'))}"></div>
        <div class="field-row cols-3">
          <div><label>SportsEngine roster URL</label><input id="prodSportsEngineRosterUrl" placeholder="https://..." value="${esc(sourceValue('sportsengine', 'roster'))}"></div>
          <div><label>SportsEngine chat URL</label><input id="prodSportsEngineChatUrl" placeholder="https://..." value="${esc(sourceValue('sportsengine', 'chat'))}"></div>
          <div><label>SportsEngine schedule URL</label><input id="prodSportsEngineScheduleUrl" placeholder="https://..." value="${esc(sourceValue('sportsengine', 'schedule'))}"></div>
        </div>
        <div class="btn-row"><button class="btn primary" ${manageDisabled} onclick="saveProductionSourceLinksUI()">Save Source Links</button><button class="btn" onclick="openSportsEngineChatUI()">Open Chat</button><button class="btn" onclick="openSportsEngineRosterUI()">Open Roster</button></div>
      </div>

      <div class="panel coach-panel prod-panel">
        <div class="panel-title"><span>Production Logo Upload</span><span class="count">Storage</span></div>
        <p class="settings-note">This uploads the team logo to the Supabase <code>team-logos</code> bucket and saves the public URL on the team record.</p>
        <div class="field-row cols-2"><div><label>Upload persistent logo</label><input id="prodLogoUpload" type="file" accept="image/*"></div><div><label>&nbsp;</label><button class="btn primary full" ${manageDisabled} onclick="uploadProductionLogoUI()">Upload Logo to Supabase</button></div></div>
      </div>
    </div>
  `;
}

function renderParentPreviewHtml(data = lastProductionData) {
  const players = (data?.players || []).slice(0, 20);
  const publishedLineup = (data?.lineups || []).find(l => l.status === 'published');
  const publishedPractice = (data?.practices || []).find(p => p.status === 'published');
  const imports = data?.imports || [];
  return `
    <div class="prod-parent-preview">
      <div class="panel-title"><span>Parent Portal Preview</span><span class="count">Live Data</span></div>
      <div class="prod-parent-grid">
        <div><strong>${esc(players.length)}</strong><span>Roster players</span></div>
        <div><strong>${esc(publishedLineup ? 'Yes' : 'No')}</strong><span>Published lineup</span></div>
        <div><strong>${esc(publishedPractice ? 'Yes' : 'No')}</strong><span>Published practice</span></div>
        <div><strong>${esc(imports.length)}</strong><span>Stat imports</span></div>
      </div>
    </div>
  `;
}

async function hydrateProductionTeamHub() {
  const mounts = [document.getElementById('productionTeamHubMount'), document.getElementById('teamManagerProductionMount')].filter(Boolean);
  if (!mounts.length) return;
  lastContext = await getProductionTeamContext();
  try {
    if (lastContext.ready) lastProductionData = await loadProductionTeamHubData();
  } catch (error) {
    lastProductionData = null;
    lastContext = { ...lastContext, error: error.message || String(error) };
  }
  const html = renderProductionHubHtml(lastContext, lastProductionData);
  mounts.forEach(mount => { mount.innerHTML = html; });
  const parentPreview = document.getElementById('productionParentPreviewMount');
  if (parentPreview) parentPreview.innerHTML = renderParentPreviewHtml(lastProductionData);
}

async function runAction(label, fn) {
  try {
    toast(`${label}...`);
    const result = await fn();
    await hydrateProductionTeamHub();
    toast(`${label} complete`);
    return result;
  } catch (error) {
    console.error(error);
    toast(`${label} failed: ${error.message || error}`);
    return null;
  }
}

window.pullProductionTeamDataUI = async function () {
  return runAction('Pull production data', async () => {
    const result = await pullRosterFromSupabaseIntoState(window.state || {});
    if (typeof window.sortRoster === 'function') window.sortRoster();
    if (typeof window.renderRoster === 'function') window.renderRoster();
    saveLocal();
    return result;
  });
};

window.pushRosterProductionUI = async function () {
  return runAction('Roster sync', async () => syncRosterToSupabase(window.state || {}));
};

window.publishLineupProductionUI = async function () {
  return runAction('Lineup publish', async () => saveLineupToSupabase(window.state || {}, { publish: true }));
};

window.publishPracticeProductionUI = async function () {
  return runAction('Practice publish', async () => publishCurrentPracticeToSupabase(window.state || {}));
};

window.saveBrandingProductionUI = async function () {
  return runAction('Branding sync', async () => saveTeamBrandingToSupabase(window.state || {}));
};

window.loadBrandingProductionUI = async function () {
  return runAction('Branding pull', async () => {
    const brand = await loadTeamBrandingFromSupabase(window.state || {});
    if (window.BenchBossBranding?.applyTeamBranding) window.BenchBossBranding.applyTeamBranding(window.state || {});
    if (window.BenchBossBranding?.hydrateBrandingSettings) window.BenchBossBranding.hydrateBrandingSettings(window.state || {});
    saveLocal();
    return brand;
  });
};

window.uploadProductionLogoUI = async function () {
  const file = document.getElementById('prodLogoUpload')?.files?.[0];
  return runAction('Logo upload', async () => {
    const url = await uploadTeamLogoToSupabase(file, window.state || {});
    if (window.BenchBossBranding?.applyTeamBranding) window.BenchBossBranding.applyTeamBranding(window.state || {});
    saveLocal();
    return url;
  });
};

window.saveProductionSourceLinksUI = async function () {
  return runAction('Source links save', async () => saveTeamSourceLinks({
    gamesheetUrl: document.getElementById('prodGameSheetUrl')?.value || '',
    sportsEngineRosterUrl: document.getElementById('prodSportsEngineRosterUrl')?.value || '',
    sportsEngineChatUrl: document.getElementById('prodSportsEngineChatUrl')?.value || '',
    sportsEngineScheduleUrl: document.getElementById('prodSportsEngineScheduleUrl')?.value || '',
  }));
};

window.createProductionInviteUI = async function () {
  return runAction('Invite link', async () => {
    const email = document.getElementById('prodInviteEmail')?.value || '';
    const role = document.getElementById('prodInviteRole')?.value || 'parent';
    const invite = await createTeamInvite({ email, role });
    const mount = document.getElementById('prodInviteResult');
    if (mount) mount.innerHTML = `<div class="prod-created-link"><strong>Invite created</strong><code>${esc(invite.inviteUrl)}</code><button class="btn small" onclick="navigator.clipboard.writeText('${esc(invite.inviteUrl)}')">Copy</button></div>`;
    return invite;
  });
};

window.copyParentPortalLinkUI = async function () {
  const url = parentPortalUrl(lastContext);
  await navigator.clipboard?.writeText(url);
  toast('Parent portal link copied');
};

window.openSportsEngineChatUI = function () {
  const url = document.getElementById('prodSportsEngineChatUrl')?.value || sourceValue('sportsengine', 'chat');
  if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast('Add a SportsEngine chat URL first');
};
window.openSportsEngineRosterUI = function () {
  const url = document.getElementById('prodSportsEngineRosterUrl')?.value || sourceValue('sportsengine', 'roster');
  if (url) window.open(url, '_blank', 'noopener,noreferrer'); else toast('Add a SportsEngine roster URL first');
};

window.acceptInviteFromUrlUI = async function () {
  const token = new URLSearchParams(window.location.search).get('invite');
  if (!token) return null;
  return runAction('Accept invite', async () => acceptTeamInvite(token));
};

const previous = window.BearDenHQ || {};
window.BearDenHQ = {
  ...previous,
  hydrateProductionTeamHub,
};

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(hydrateProductionTeamHub, 600);
});
setTimeout(hydrateProductionTeamHub, 1200);
