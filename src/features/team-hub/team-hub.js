// src/features/team-hub/team-hub.js
// Team Hub v1: roster import, parent view, GameSheet stats dashboard.
// Client-first integration: imports data now, API sync can be layered on later.

const TEAM_HUB_VERSION = '0.5.0';

export const SPORTENGINE_12U_T2_ROSTER = {
  organization: 'Black Bear Hockey',
  season: '2024 - 2025',
  division: 'Black Bears Youth 12U T2 (All Seasons)',
  teamName: 'Black Bears Youth 12U T2',
  players: [
    { num: '1', name: 'Kessler, Reid', dob: '07/2013', pos: 'F' },
    { num: '3', name: 'Caswell, Beckham', dob: '04/2012', pos: 'F' },
    { num: '5', name: 'Kessler, Gavin', dob: '07/2013', pos: 'F' },
    { num: '7', name: 'Edson, Chase', dob: '05/2012', pos: 'F' },
    { num: '10', name: 'Noyes, Warren', dob: '09/2013', pos: 'F' },
    { num: '12', name: 'OToole, Bruce', dob: '11/2013', pos: 'F' },
    { num: '13', name: 'Merrill, Davern', dob: '07/2013', pos: 'F' },
    { num: '14', name: 'Edson, Brody', dob: '03/2012', pos: 'F' },
    { num: '17', name: 'Weide, Landon', dob: '11/2013', pos: 'F' },
    { num: '18', name: 'Mascitti, Mikeljon', dob: '06/2013', pos: 'F' },
    { num: '40', name: 'Ladieu, Lukas', dob: '04/2012', pos: 'F' },
    { num: '55', name: 'Herlihy, Baxter', dob: '04/2012', pos: 'F' },
  ],
  staff: [
    { name: 'Darby, Sandra', title: 'Team Manager', phone: '8025785724' },
    { name: 'Edson, Timothy', title: 'General Staff', phone: '8028817475' },
    { name: 'Gray, Nathan', title: 'Coach', phone: '8024987499' },
    { name: 'Herlihy, Daniel', title: 'General Staff', phone: '8025058654' },
    { name: 'Merrill, Andrew', title: 'Coach', phone: '8024984437' },
    { name: 'Noyes, Warren', title: 'General Staff', phone: '' },
    { name: 'Van Deren, Jessica', title: 'Team Manager', phone: '8023183051' },
    { name: 'Weide, Tristan', title: 'General Staff', phone: '8022799451' },
  ],
};

const DEFAULT_GAMESHEET_URL = 'https://gamesheetstats.com/seasons/10754/scores?filter%5Bdivision%5D=overall';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function asArray(v) { return Array.isArray(v) ? v : []; }
function normalizeName(name) {
  const s = String(name || '').trim();
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(x => x.trim());
    return `${first} ${last}`.replace(/\s+/g, ' ').toLowerCase();
  }
  return s.replace(/\s+/g, ' ').toLowerCase();
}
function displayName(name) {
  const s = String(name || '').trim();
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(x => x.trim());
    return `${first} ${last}`.trim();
  }
  return s;
}
function findRosterPlayer(state, imported) {
  const num = String(imported.num || '').trim();
  const rawName = normalizeName(imported.name || '');
  return asArray(state.roster).find(p => String(p.num || '').trim() === num)
    || asArray(state.roster).find(p => normalizeName(p.name) === rawName);
}

function ensureTeamHubState(state) {
  state.teamHub = state.teamHub || {};
  state.teamHub.version = TEAM_HUB_VERSION;
  state.teamHub.sources = state.teamHub.sources || {
    sportsEngine: { mode: 'manual', url: '', lastImportAt: '' },
    gameSheet: { mode: 'public-url', url: DEFAULT_GAMESHEET_URL, lastSyncAt: '', lastError: '' },
  };
  state.teamHub.sources.sportsEngine = state.teamHub.sources.sportsEngine || { mode: 'manual', url: '', lastImportAt: '' };
  state.teamHub.sources.gameSheet = state.teamHub.sources.gameSheet || { mode: 'public-url', url: DEFAULT_GAMESHEET_URL, lastSyncAt: '', lastError: '' };
  state.teamHub.staff = asArray(state.teamHub.staff);
  state.teamHub.publishedDrills = asArray(state.teamHub.publishedDrills);
  state.teamHub.parentAnnouncements = asArray(state.teamHub.parentAnnouncements);
  state.teamHub.importedGameSheet = state.teamHub.importedGameSheet || { games: [], playerStats: [], teamStats: null, rawRows: [] };
  state.teamHub.lineups = asArray(state.teamHub.lineups);
  return state;
}

function importSportsEnginePdfRoster(state, options = {}) {
  ensureTeamHubState(state);
  const replace = options.replace !== false;
  const now = new Date().toISOString();
  const seeded = SPORTENGINE_12U_T2_ROSTER.players.map(p => {
    const existing = findRosterPlayer(state, p);
    return { id: existing?.id || crypto.randomUUID(), num: p.num, name: displayName(p.name), dob: p.dob, pos: existing?.pos || p.pos || 'F', source: 'sportsengine-pdf', importedAt: now };
  });
  if (replace) state.roster = seeded;
  else {
    const merged = [...asArray(state.roster)];
    seeded.forEach(p => {
      const i = merged.findIndex(x => x.id === p.id || (String(x.num) === String(p.num) && normalizeName(x.name) === normalizeName(p.name)));
      if (i >= 0) merged[i] = { ...merged[i], ...p };
      else merged.push(p);
    });
    state.roster = merged;
  }
  state.teamHub.staff = SPORTENGINE_12U_T2_ROSTER.staff.map(s => ({ ...s, id: crypto.randomUUID(), source: 'sportsengine-pdf', importedAt: now }));
  state.teamHub.sources.sportsEngine = { mode: 'pdf-import', url: '', lastImportAt: now };
  state.teamHub.organization = SPORTENGINE_12U_T2_ROSTER.organization;
  state.teamHub.teamName = SPORTENGINE_12U_T2_ROSTER.teamName;
  state.teamHub.season = SPORTENGINE_12U_T2_ROSTER.season;
  state.teamHub.division = SPORTENGINE_12U_T2_ROSTER.division;
  return state;
}

function publishCurrentPractice(state) {
  ensureTeamHubState(state);
  const plan = state.currentPlan;
  if (!plan || !asArray(plan.blocks).length) return { ok: false, message: 'Build a practice first.' };
  const id = plan.id || crypto.randomUUID();
  const published = {
    id, title: plan.title || 'Published Practice', date: plan.date || new Date().toISOString().slice(0, 10), theme: plan.theme || '',
    blocks: asArray(plan.blocks).map(b => ({ name: b.name, minutes: b.minutes, drillId: b.drillId || b.id || null, coachingPoints: b.coachingPoints || b.points || [] })),
    publishedAt: new Date().toISOString(),
  };
  state.teamHub.publishedDrills = [published, ...asArray(state.teamHub.publishedDrills).filter(p => p.id !== id)].slice(0, 20);
  return { ok: true, published };
}

function parseGameSheetCsv(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { games: [], playerStats: [], rawRows: [] };
  const split = (line) => {
    const cells = []; let current = ''; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(current.trim()); current = ''; }
      else current += ch;
    }
    cells.push(current.trim());
    return cells.map(c => c.replace(/^"|"$/g, ''));
  };
  const header = split(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9#]+/g, ''));
  const rows = lines.slice(1).map(line => {
    const cells = split(line); const row = {};
    header.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
  const playerStats = rows.map(r => ({
    num: r.no || r.number || r.playernumber || r.jerseynumber || r['#'] || '',
    name: r.player || r.name || r.playername || '',
    gp: Number(r.gp || r.gamesplayed || 0), g: Number(r.g || r.goals || 0), a: Number(r.a || r.assists || 0), pts: Number(r.pts || r.points || 0), pim: Number(r.pim || r.penaltyminutes || 0),
  })).filter(r => r.name || r.num);
  return { games: [], playerStats, rawRows: rows };
}

async function fetchGameSheetPublicUrl(state, url) {
  ensureTeamHubState(state);
  const target = url || state.teamHub.sources.gameSheet.url || DEFAULT_GAMESHEET_URL;
  state.teamHub.sources.gameSheet.url = target;
  state.teamHub.sources.gameSheet.lastError = '';
  try {
    const res = await fetch(`/.netlify/functions/gamesheet-import?url=${encodeURIComponent(target)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'GameSheet import failed');
    state.teamHub.importedGameSheet.games = data.games || [];
    state.teamHub.importedGameSheet.teamStats = data.teamStats || null;
    state.teamHub.importedGameSheet.lastImportSummary = data.summary || '';
    state.teamHub.sources.gameSheet.lastSyncAt = new Date().toISOString();
    return data;
  } catch (err) {
    state.teamHub.sources.gameSheet.lastError = err.message || String(err);
    throw err;
  }
}

function importGameSheetPastedStats(state, text) {
  ensureTeamHubState(state);
  const parsed = parseGameSheetCsv(text);
  state.teamHub.importedGameSheet.playerStats = parsed.playerStats;
  state.teamHub.importedGameSheet.rawRows = parsed.rawRows;
  state.teamHub.sources.gameSheet.lastSyncAt = new Date().toISOString();
  state.teamHub.sources.gameSheet.lastError = '';
  return parsed;
}

function getParentViewData(state) {
  ensureTeamHubState(state);
  const games = asArray(state.games);
  const nextGame = state.gameDay?.opponent ? state.gameDay : null;
  const published = asArray(state.teamHub.publishedDrills).slice(0, 5);
  const leaders = asArray(state.roster).filter(p => p.pos !== 'G').map(p => {
    let stats = { gp: 0, g: 0, a: 0, pts: 0 };
    if (typeof window.computeSkaterStats === 'function') stats = window.computeSkaterStats(p.id);
    return { player: p, stats };
  }).sort((a,b) => (b.stats.pts || 0) - (a.stats.pts || 0)).slice(0, 5);
  return { nextGame, published, leaders, gameCount: games.length, rosterCount: asArray(state.roster).length };
}

function renderParentTeamHubHtml(state) {
  const data = getParentViewData(state); const next = data.nextGame;
  return `
    <div class="teamhub-shell">
      <div class="teamhub-hero"><div><div class="coach-kicker">Team Hub</div><h2>Parent & Manager View</h2><p>Roster, GameSheet stats, lineups, published practices, and team updates in one place.</p></div><div class="teamhub-actions"><button class="btn primary full" onclick="navTo('stats')">View Stats</button><button class="btn full" onclick="navTo('lines')">Check Lineup</button></div></div>
      <div class="coach-grid-2">
        <div class="panel coach-panel"><div class="panel-title"><span>Next Game</span></div>${next ? `<div class="teamhub-big">${esc(next.homeAway === 'A' ? '@' : 'vs')} ${esc(next.opponent || 'Opponent')}</div><div class="teamhub-muted">${esc(next.date || '')} ${esc(next.puck || '')} · ${esc(next.rink || '')}</div>` : `<div class="empty-state">No game-day packet set.</div>`}</div>
        <div class="panel coach-panel"><div class="panel-title"><span>Published Practices</span><button class="btn small" onclick="publishPracticeToParents()">Publish Current</button></div>${data.published.length ? data.published.map(p => `<div class="coach-plan-row"><div><div class="coach-plan-title">${esc(p.title)}</div><div class="coach-plan-meta">${esc(p.date)} · ${esc(p.blocks.length)} blocks</div></div><button class="btn small" onclick="navTo('practice')">Open</button></div>`).join('') : `<div class="empty-state">No practices published yet.</div>`}</div>
      </div>
      <div class="panel coach-panel"><div class="panel-title"><span>Parent Stat Snapshot</span><span class="count">${data.rosterCount} players</span></div>${data.leaders.length ? data.leaders.map(x => `<div class="teamhub-stat-row"><span>#${esc(x.player.num)} ${esc(x.player.name)}</span><strong>${x.stats.pts || 0} pts</strong><small>${x.stats.g || 0}G · ${x.stats.a || 0}A</small></div>`).join('') : `<div class="empty-state">Stats appear after games or GameSheet import.</div>`}</div>
    </div>`;
}

function renderRosterImportHtml(state) {
  ensureTeamHubState(state); const staffCount = state.teamHub.staff.length;
  return `<div class="panel teamhub-panel"><div class="panel-title"><span>SportsEngine Roster Import</span><span class="count">PDF seed</span></div><div class="teamhub-muted">Import the Black Bears Youth 12U T2 roster/staff from the uploaded SportsEngine PDF, then edit positions as needed.</div><div class="btn-row"><button class="btn primary full" onclick="importSportsEnginePdfRosterUI()">Import SportsEngine PDF Roster</button><button class="btn full" onclick="mergeSportsEnginePdfRosterUI()">Merge Without Replacing</button></div><div class="teamhub-source-note">Staff loaded: ${staffCount}. Last import: ${esc(state.teamHub.sources.sportsEngine.lastImportAt || 'Never')}</div></div>`;
}

function renderGameSheetDashboardHtml(state) {
  ensureTeamHubState(state); const gs = state.teamHub.importedGameSheet; const teamStats = gs.teamStats || {}; const importedPlayers = asArray(gs.playerStats).slice().sort((a,b) => (b.pts || 0) - (a.pts || 0)); const games = asArray(gs.games);
  return `<div class="panel teamhub-panel"><div class="panel-title"><span>GameSheet Integration</span><span class="count">v1</span></div><div class="field"><label>GameSheet public scores/stats URL</label><input id="gamesheetUrl" value="${esc(state.teamHub.sources.gameSheet.url || DEFAULT_GAMESHEET_URL)}" placeholder="https://gamesheetstats.com/seasons/..."></div><div class="btn-row"><button class="btn primary full" onclick="syncGameSheetUrlUI()">Sync Public URL</button><button class="btn full" onclick="toggleGameSheetPasteBox()">Paste CSV Stats</button></div><div id="gamesheetPasteBox" style="display:none; margin-top:10px"><label>Paste exported skater stats CSV</label><textarea id="gamesheetCsvPaste" rows="6" placeholder="#,Player,GP,G,A,PTS,PIM"></textarea><button class="btn primary full" onclick="importGameSheetCsvUI()" style="margin-top:8px">Import Pasted Stats</button></div>${state.teamHub.sources.gameSheet.lastError ? `<div class="teamhub-error">${esc(state.teamHub.sources.gameSheet.lastError)}</div>` : ''}<div class="teamhub-source-note">Last sync: ${esc(state.teamHub.sources.gameSheet.lastSyncAt || 'Never')}</div><div class="teamhub-metrics"><div><strong>${esc(teamStats.record || '—')}</strong><span>Record</span></div><div><strong>${games.length || '—'}</strong><span>Imported games</span></div><div><strong>${importedPlayers.length || '—'}</strong><span>Imported stat rows</span></div></div>${games.length ? `<div class="teamhub-game-list">${games.slice(0,8).map(g => `<div class="teamhub-game-row"><span>${esc(g.date || '')}</span><strong>${esc(g.away || '')} ${esc(g.awayScore ?? '')} - ${esc(g.homeScore ?? '')} ${esc(g.home || '')}</strong></div>`).join('')}</div>` : ''}${importedPlayers.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>GP</th><th>PTS</th><th>G</th><th>A</th><th>PIM</th></tr></thead><tbody>${importedPlayers.map(p => `<tr><td>#${esc(p.num)}</td><td>${esc(p.name)}</td><td>${p.gp || 0}</td><td class="highlight-col">${p.pts || 0}</td><td>${p.g || 0}</td><td>${p.a || 0}</td><td>${p.pim || 0}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">Use public URL sync for scores, or paste exported GameSheet stats CSV.</div>`}</div>`;
}

function hydrateTeamHubPanels(state) {
  ensureTeamHubState(state);
  const parentMount = document.getElementById('teamHubParentMount'); if (parentMount) parentMount.innerHTML = renderParentTeamHubHtml(state);
  const rosterMount = document.getElementById('teamHubRosterImportMount'); if (rosterMount) rosterMount.innerHTML = renderRosterImportHtml(state);
  const statsMount = document.getElementById('gamesheetDashboardMount'); if (statsMount) statsMount.innerHTML = renderGameSheetDashboardHtml(state);
}
function saveAndRefresh(message) {
  if (typeof window.save === 'function') window.save(); else if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.sortRoster === 'function') window.sortRoster();
  if (typeof window.renderRoster === 'function') window.renderRoster();
  if (typeof window.renderStats === 'function') window.renderStats();
  if (typeof window.renderDashboard === 'function') window.renderDashboard();
  hydrateTeamHubPanels(window.state || {});
  if (message && typeof window.toast === 'function') window.toast(message);
}

window.importSportsEnginePdfRosterUI = function () { importSportsEnginePdfRoster(window.state, { replace: true }); saveAndRefresh('SportsEngine roster imported'); };
window.mergeSportsEnginePdfRosterUI = function () { importSportsEnginePdfRoster(window.state, { replace: false }); saveAndRefresh('SportsEngine roster merged'); };
window.publishPracticeToParents = function () { const result = publishCurrentPractice(window.state); saveAndRefresh(result.ok ? 'Practice published to Team Hub' : result.message); };
window.toggleGameSheetPasteBox = function () { const box = document.getElementById('gamesheetPasteBox'); if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
window.importGameSheetCsvUI = function () { const text = document.getElementById('gamesheetCsvPaste')?.value || ''; const parsed = importGameSheetPastedStats(window.state, text); saveAndRefresh(`Imported ${parsed.playerStats.length} GameSheet stat rows`); };
window.syncGameSheetUrlUI = async function () { const url = document.getElementById('gamesheetUrl')?.value || DEFAULT_GAMESHEET_URL; try { const data = await fetchGameSheetPublicUrl(window.state, url); saveAndRefresh(`Synced ${data.games?.length || 0} GameSheet games`); } catch (err) { saveAndRefresh(`GameSheet sync note: ${err.message || err}`); } };

window.BearDenHQ = { ...(window.BearDenHQ || {}), TEAM_HUB_VERSION, SPORTENGINE_12U_T2_ROSTER, ensureTeamHubState, importSportsEnginePdfRoster, importGameSheetPastedStats, fetchGameSheetPublicUrl, publishCurrentPractice, renderParentTeamHubHtml, renderRosterImportHtml, renderGameSheetDashboardHtml, hydrateTeamHubPanels };
window.addEventListener('DOMContentLoaded', () => { if (window.state) hydrateTeamHubPanels(window.state); });

// v0.5.2 GameSheet production importer upgrade: import history, better CSV endpoint parsing,
// snapshot tracking, and dashboard diagnostics. Appended as a non-breaking override.
(function installGameSheetProductionUpgrade(){
  const VERSION = '0.5.2';

  function ensureGameSheetV052(state) {
    ensureTeamHubState(state);
    state.teamHub.version = VERSION;
    state.teamHub.importedGameSheet = state.teamHub.importedGameSheet || {};
    state.teamHub.importedGameSheet.games = asArray(state.teamHub.importedGameSheet.games);
    state.teamHub.importedGameSheet.playerStats = asArray(state.teamHub.importedGameSheet.playerStats);
    state.teamHub.importedGameSheet.snapshots = asArray(state.teamHub.importedGameSheet.snapshots);
    state.teamHub.importedGameSheet.importErrors = asArray(state.teamHub.importedGameSheet.importErrors);
    state.teamHub.importedGameSheet.diagnostics = state.teamHub.importedGameSheet.diagnostics || null;
    state.teamHub.sources.gameSheet.refresh = state.teamHub.sources.gameSheet.refresh || { schedule: 'manual', lastScheduledAt: '', enabled: false };
    return state;
  }

  function rememberGameSheetError(state, err, context = {}) {
    ensureGameSheetV052(state);
    const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), message: err?.message || String(err), context };
    state.teamHub.importedGameSheet.importErrors = [entry, ...state.teamHub.importedGameSheet.importErrors].slice(0, 10);
    state.teamHub.sources.gameSheet.lastError = entry.message;
    return entry;
  }

  function applyGameSheetImport(state, data, sourceLabel) {
    ensureGameSheetV052(state);
    const snapshot = data.importSnapshot || {
      id: `gs_${Date.now()}`,
      importedAt: new Date().toISOString(),
      source: sourceLabel || 'gamesheet',
      url: state.teamHub.sources.gameSheet.url || '',
      games: data.games || [],
      playerStats: data.playerStats || [],
      gamesCount: (data.games || []).length,
      playerStatsCount: (data.playerStats || []).length,
      teamStats: data.teamStats || null,
      warnings: data.warnings || [],
    };
    state.teamHub.importedGameSheet.games = data.games || snapshot.games || [];
    state.teamHub.importedGameSheet.playerStats = data.playerStats || snapshot.playerStats || [];
    state.teamHub.importedGameSheet.teamStats = data.teamStats || snapshot.teamStats || null;
    state.teamHub.importedGameSheet.lastImportSummary = data.summary || '';
    state.teamHub.importedGameSheet.diagnostics = data.diagnostics || null;
    state.teamHub.importedGameSheet.lastWarnings = data.warnings || snapshot.warnings || [];
    state.teamHub.importedGameSheet.snapshots = [snapshot, ...asArray(state.teamHub.importedGameSheet.snapshots).filter(s => s.id !== snapshot.id)].slice(0, 12);
    state.teamHub.sources.gameSheet.lastSyncAt = new Date().toISOString();
    state.teamHub.sources.gameSheet.lastError = '';
    return snapshot;
  }

  async function fetchGameSheetPublicUrlV052(state, url, options = {}) {
    ensureGameSheetV052(state);
    const target = url || state.teamHub.sources.gameSheet.url || DEFAULT_GAMESHEET_URL;
    state.teamHub.sources.gameSheet.url = target;
    try {
      const res = await fetch('/.netlify/functions/gamesheet-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: target, teamName: state.teamHub.teamName || 'Black Bear', persist: Boolean(options.persist), teamId: options.teamId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'GameSheet import failed');
      applyGameSheetImport(state, data, 'gamesheet-public-url');
      return data;
    } catch (err) {
      rememberGameSheetError(state, err, { url: target });
      throw err;
    }
  }

  async function importGameSheetCsvV052(state, text, options = {}) {
    ensureGameSheetV052(state);
    try {
      const res = await fetch('/.netlify/functions/gamesheet-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: text, teamName: state.teamHub.teamName || 'Black Bear', persist: Boolean(options.persist), teamId: options.teamId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'GameSheet CSV import failed');
      applyGameSheetImport(state, data, 'gamesheet-csv');
      return data;
    } catch (err) {
      rememberGameSheetError(state, err, { source: 'csv' });
      throw err;
    }
  }

  function snapshotTrend(state) {
    ensureGameSheetV052(state);
    const [latest, previous] = state.teamHub.importedGameSheet.snapshots || [];
    if (!latest || !previous) return null;
    return {
      gamesDelta: (latest.gamesCount || 0) - (previous.gamesCount || 0),
      playerStatsDelta: (latest.playerStatsCount || 0) - (previous.playerStatsCount || 0),
      latestAt: latest.importedAt,
      previousAt: previous.importedAt,
    };
  }

  function renderWarnings(warnings) {
    const list = asArray(warnings);
    if (!list.length) return '';
    return `<div class="teamhub-warning"><strong>Import notes</strong>${list.map(w => `<div>${esc(w)}</div>`).join('')}</div>`;
  }

  function renderGameSheetDashboardHtmlV052(state) {
    ensureGameSheetV052(state);
    const gs = state.teamHub.importedGameSheet;
    const teamStats = gs.teamStats || {};
    const importedPlayers = asArray(gs.playerStats).slice().sort((a,b) => (b.pts || 0) - (a.pts || 0));
    const games = asArray(gs.games);
    const errors = asArray(gs.importErrors);
    const snapshots = asArray(gs.snapshots);
    const trend = snapshotTrend(state);
    const warnings = asArray(gs.lastWarnings);
    const diag = gs.diagnostics || {};
    return `<div class="panel teamhub-panel"><div class="panel-title"><span>GameSheet Stats Importer</span><span class="count">v${VERSION}</span></div>
      <div class="field"><label>GameSheet public scores/stats URL</label><input id="gamesheetUrl" value="${esc(state.teamHub.sources.gameSheet.url || DEFAULT_GAMESHEET_URL)}" placeholder="https://gamesheetstats.com/seasons/..."></div>
      <div class="btn-row"><button class="btn primary full" onclick="syncGameSheetUrlUI()">Sync Public URL</button><button class="btn full" onclick="toggleGameSheetPasteBox()">Paste CSV / TSV Stats</button></div>
      <div id="gamesheetPasteBox" style="display:none; margin-top:10px"><label>Paste exported skater stats CSV/TSV</label><textarea id="gamesheetCsvPaste" rows="7" placeholder="#,Player,GP,G,A,PTS,PIM"></textarea><div class="btn-row"><button class="btn primary full" onclick="importGameSheetCsvUI()" style="margin-top:8px">Import Pasted Stats</button><button class="btn full" onclick="clearGameSheetCsvUI()" style="margin-top:8px">Clear</button></div></div>
      ${state.teamHub.sources.gameSheet.lastError ? `<div class="teamhub-error">${esc(state.teamHub.sources.gameSheet.lastError)}</div>` : ''}
      ${renderWarnings(warnings)}
      <div class="teamhub-source-note">Last sync: ${esc(state.teamHub.sources.gameSheet.lastSyncAt || 'Never')} ${diag.parser ? `· Parser: ${esc(diag.parser)}` : ''}</div>
      <div class="teamhub-metrics"><div><strong>${esc(teamStats.record || '—')}</strong><span>Record</span></div><div><strong>${games.length || '—'}</strong><span>Imported games</span></div><div><strong>${importedPlayers.length || '—'}</strong><span>Imported stat rows</span></div><div><strong>${snapshots.length || '—'}</strong><span>History snapshots</span></div></div>
      ${trend ? `<div class="teamhub-source-note">Since last import: ${trend.gamesDelta >= 0 ? '+' : ''}${trend.gamesDelta} games, ${trend.playerStatsDelta >= 0 ? '+' : ''}${trend.playerStatsDelta} stat rows.</div>` : ''}
      ${games.length ? `<h4>Recent GameSheet Games</h4><div class="teamhub-game-list">${games.slice(0,10).map(g => `<div class="teamhub-game-row"><span>${esc(g.date || '')} ${esc(g.status || '')}</span><strong>${esc(g.away || '')} ${esc(g.awayScore ?? '')} - ${esc(g.homeScore ?? '')} ${esc(g.home || '')}</strong></div>`).join('')}</div>` : ''}
      ${importedPlayers.length ? `<h4>Imported Player Stats</h4><div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>GP</th><th>PTS</th><th>G</th><th>A</th><th>PIM</th><th>SOG</th></tr></thead><tbody>${importedPlayers.map(p => `<tr><td>#${esc(p.num)}</td><td>${esc(p.name)}</td><td>${p.gp || 0}</td><td class="highlight-col">${p.pts || 0}</td><td>${p.g || 0}</td><td>${p.a || 0}</td><td>${p.pim || 0}</td><td>${p.sog || 0}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">Use public URL sync for scores, or paste exported GameSheet stats CSV/TSV.</div>`}
      ${snapshots.length ? `<h4>Import History</h4><div class="teamhub-game-list">${snapshots.slice(0,6).map(s => `<div class="teamhub-game-row"><span>${esc(new Date(s.importedAt).toLocaleString())}</span><strong>${s.gamesCount || 0} games · ${s.playerStatsCount || 0} stat rows</strong></div>`).join('')}</div>` : ''}
      ${errors.length ? `<h4>Recent Import Errors</h4><div class="teamhub-game-list">${errors.slice(0,3).map(e => `<div class="teamhub-game-row"><span>${esc(new Date(e.at).toLocaleString())}</span><strong>${esc(e.message)}</strong></div>`).join('')}</div>` : ''}
      <details class="teamhub-source-note"><summary>Scheduled refresh setup</summary><p>Set <code>GAMESHEET_SYNC_URLS</code> in Netlify to a JSON array or comma-separated GameSheet URLs. The function <code>/.netlify/functions/gamesheet-refresh</code> can run manually or as a Netlify scheduled function.</p></details>
    </div>`;
  }

  function hydrateTeamHubPanelsV052(state) {
    ensureGameSheetV052(state || window.state || {});
    const parentMount = document.getElementById('teamHubParentMount'); if (parentMount) parentMount.innerHTML = renderParentTeamHubHtml(state || window.state || {});
    const rosterMount = document.getElementById('teamHubRosterImportMount'); if (rosterMount) rosterMount.innerHTML = renderRosterImportHtml(state || window.state || {});
    const statsMount = document.getElementById('gamesheetDashboardMount'); if (statsMount) statsMount.innerHTML = renderGameSheetDashboardHtmlV052(state || window.state || {});
  }

  window.importGameSheetCsvUI = async function () {
    const text = document.getElementById('gamesheetCsvPaste')?.value || '';
    try {
      const data = await importGameSheetCsvV052(window.state, text);
      saveAndRefresh(`Imported ${data.playerStats?.length || 0} GameSheet stat rows`);
    } catch (err) { saveAndRefresh(`GameSheet CSV note: ${err.message || err}`); }
  };
  window.clearGameSheetCsvUI = function () { const box = document.getElementById('gamesheetCsvPaste'); if (box) box.value = ''; };
  window.syncGameSheetUrlUI = async function () {
    const url = document.getElementById('gamesheetUrl')?.value || DEFAULT_GAMESHEET_URL;
    try {
      const data = await fetchGameSheetPublicUrlV052(window.state, url);
      saveAndRefresh(`Synced ${data.games?.length || 0} games and ${data.playerStats?.length || 0} stat rows`);
    } catch (err) { saveAndRefresh(`GameSheet sync note: ${err.message || err}`); }
  };
  window.BearDenHQ = { ...(window.BearDenHQ || {}), TEAM_HUB_VERSION: VERSION, ensureGameSheetV052, fetchGameSheetPublicUrl: fetchGameSheetPublicUrlV052, importGameSheetCsv: importGameSheetCsvV052, renderGameSheetDashboardHtml: renderGameSheetDashboardHtmlV052, hydrateTeamHubPanels: hydrateTeamHubPanelsV052 };
  window.addEventListener('DOMContentLoaded', () => { if (window.state) hydrateTeamHubPanelsV052(window.state); });
})();
