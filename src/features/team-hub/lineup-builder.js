// src/features/team-hub/lineup-builder.js
// Lineup Builder v1: game-specific lineups, scratches/absent tracking,
// printable lineup cards, and share text for assistant coaches/parents.

const LINEUP_BUILDER_VERSION = '0.5.1';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function asArray(v) { return Array.isArray(v) ? v : []; }
function clone(v) { return JSON.parse(JSON.stringify(v || {})); }
function getState() { return window.state || {}; }
function playerById(state, id) { return asArray(state.roster).find(p => p.id === id) || null; }
function playerLabel(state, id) {
  const p = playerById(state, id);
  return p ? `#${p.num || '-'} ${p.name}` : '—';
}
function lastName(name) {
  return String(name || '').trim().split(/\s+/).pop() || name || '—';
}
function lineKeys(type) {
  const cfg = window.LINE_CONFIG || {};
  return Object.keys(cfg).filter(k => cfg[k]?.type === type);
}
function currentGameLabel(state) {
  const gd = state.gameDay || {};
  const opponent = gd.opponent ? `${gd.homeAway === 'A' ? '@' : 'vs'} ${gd.opponent}` : 'Game Lineup';
  const date = gd.date || new Date().toISOString().slice(0, 10);
  return `${date} ${opponent}`.trim();
}

function ensureLineupBuilderState(state = getState()) {
  state.teamHub = state.teamHub || {};
  state.teamHub.lineups = asArray(state.teamHub.lineups);
  state.teamHub.lineupBuilder = state.teamHub.lineupBuilder || {
    activeLineupId: '',
    scratchReason: {},
    notes: '',
  };
  state.teamHub.lineupBuilder.scratchReason = state.teamHub.lineupBuilder.scratchReason || {};
  return state;
}

function summarizeLineCompleteness(state, lines = state.lines) {
  const cfg = window.LINE_CONFIG || {};
  let filled = 0; let total = 0;
  Object.keys(cfg).forEach(id => {
    const slots = cfg[id]?.positions || [];
    total += slots.length;
    filled += asArray(lines?.[id]?.players).filter(Boolean).length;
  });
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
}

function buildLineupSnapshot(state, form = {}) {
  ensureLineupBuilderState(state);
  const id = form.id || crypto.randomUUID();
  const label = form.label || currentGameLabel(state);
  const notes = form.notes ?? state.teamHub.lineupBuilder.notes ?? '';
  const scratchReason = clone(state.teamHub.lineupBuilder.scratchReason);
  return {
    id,
    label,
    opponent: form.opponent || state.gameDay?.opponent || '',
    date: form.date || state.gameDay?.date || new Date().toISOString().slice(0, 10),
    homeAway: form.homeAway || state.gameDay?.homeAway || 'H',
    jersey: form.jersey || state.gameDay?.jersey || '',
    rink: form.rink || state.gameDay?.rink || '',
    notes,
    scratchReason,
    lines: clone(state.lines),
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveCurrentLineup(state = getState()) {
  ensureLineupBuilderState(state);
  const labelEl = document.getElementById('lineupGameLabel');
  const notesEl = document.getElementById('lineupNotes');
  const selectedId = document.getElementById('lineupSavedSelect')?.value || '';
  const existing = asArray(state.teamHub.lineups).find(l => l.id === selectedId);
  const snapshot = buildLineupSnapshot(state, {
    id: existing?.id,
    label: labelEl?.value?.trim() || existing?.label || currentGameLabel(state),
    notes: notesEl?.value || '',
    createdAt: existing?.createdAt,
  });
  const i = state.teamHub.lineups.findIndex(l => l.id === snapshot.id);
  if (i >= 0) state.teamHub.lineups[i] = snapshot;
  else state.teamHub.lineups.unshift(snapshot);
  state.teamHub.lineupBuilder.activeLineupId = snapshot.id;
  if (typeof window.save === 'function') window.save();
  hydrateLineupBuilder(state);
  window.toast?.(`Saved lineup: ${snapshot.label}`);
  return snapshot;
}

function loadSavedLineup(lineupId, state = getState()) {
  ensureLineupBuilderState(state);
  const lineup = state.teamHub.lineups.find(l => l.id === lineupId);
  if (!lineup) return;
  state.lines = clone(lineup.lines);
  state.teamHub.lineupBuilder.activeLineupId = lineup.id;
  state.teamHub.lineupBuilder.scratchReason = clone(lineup.scratchReason || {});
  state.teamHub.lineupBuilder.notes = lineup.notes || '';
  if (typeof window.save === 'function') window.save();
  if (typeof window.renderLines === 'function') window.renderLines();
  hydrateLineupBuilder(state);
  window.toast?.(`Loaded lineup: ${lineup.label}`);
}

function deleteSavedLineup(lineupId, state = getState()) {
  ensureLineupBuilderState(state);
  const lineup = state.teamHub.lineups.find(l => l.id === lineupId);
  if (!lineup) return;
  if (!confirm(`Delete saved lineup "${lineup.label}"?`)) return;
  state.teamHub.lineups = state.teamHub.lineups.filter(l => l.id !== lineupId);
  if (state.teamHub.lineupBuilder.activeLineupId === lineupId) state.teamHub.lineupBuilder.activeLineupId = '';
  if (typeof window.save === 'function') window.save();
  hydrateLineupBuilder(state);
  window.toast?.('Lineup deleted');
}

function setScratchReason(playerId, reason, state = getState()) {
  ensureLineupBuilderState(state);
  if (!reason) delete state.teamHub.lineupBuilder.scratchReason[playerId];
  else state.teamHub.lineupBuilder.scratchReason[playerId] = reason;
  if (typeof window.save === 'function') window.save();
  hydrateLineupBuilder(state);
}

function getAssignedPlayerIds(lines) {
  const ids = new Set();
  Object.values(lines || {}).forEach(line => asArray(line.players).forEach(pid => { if (pid) ids.add(pid); }));
  return ids;
}

function renderLineTable(state, lines = state.lines) {
  const cfg = window.LINE_CONFIG || {};
  const renderGroup = (title, type) => {
    const keys = lineKeys(type);
    return `<div class="lineup-card-group"><h4>${esc(title)}</h4>${keys.map(id => {
      const config = cfg[id];
      const players = asArray(lines?.[id]?.players);
      const slots = asArray(config?.positions).map((pos, i) => `<td><span class="lineup-pos">${esc(pos)}</span><strong>${esc(playerLabel(state, players[i]))}</strong></td>`).join('');
      const tags = asArray(lines?.[id]?.tags).map(t => `<span class="pill">${esc((window.TAG_LABELS || {})[t] || t)}</span>`).join(' ');
      return `<div class="lineup-card-row"><div class="lineup-line-title">${esc(config?.label || id)} ${tags}</div><table class="lineup-table"><tr>${slots}</tr></table></div>`;
    }).join('')}</div>`;
  };
  return `${renderGroup('Forwards', 'fwd')}${renderGroup('Defense', 'def')}${renderGroup('Goalies', 'goal')}`;
}

function renderUnavailablePanel(state) {
  ensureLineupBuilderState(state);
  const assigned = getAssignedPlayerIds(state.lines);
  const reasons = state.teamHub.lineupBuilder.scratchReason;
  const players = asArray(state.roster).slice().sort((a,b) => (parseInt(a.num)||999) - (parseInt(b.num)||999));
  return `<div class="lineup-unavailable-grid">${players.map(p => {
    const reason = reasons[p.id] || '';
    const status = reason || (assigned.has(p.id) ? 'IN' : 'UNASSIGNED');
    return `<div class="lineup-player-status ${reason ? 'is-out' : assigned.has(p.id) ? 'is-in' : 'is-unassigned'}">
      <div><strong>#${esc(p.num)} ${esc(p.name)}</strong><small>${esc(p.pos || '')} · ${esc(status)}</small></div>
      <select onchange="BearDenHQ.setLineupScratchReason('${p.id}', this.value)">
        <option value="" ${!reason ? 'selected' : ''}>Available</option>
        <option value="Scratch" ${reason === 'Scratch' ? 'selected' : ''}>Scratch</option>
        <option value="Absent" ${reason === 'Absent' ? 'selected' : ''}>Absent</option>
        <option value="Injured" ${reason === 'Injured' ? 'selected' : ''}>Injured</option>
        <option value="Discipline" ${reason === 'Discipline' ? 'selected' : ''}>Discipline</option>
      </select>
    </div>`;
  }).join('')}</div>`;
}

function renderSavedLineupOptions(state) {
  ensureLineupBuilderState(state);
  const active = state.teamHub.lineupBuilder.activeLineupId || '';
  return `<option value="">— New / current lines —</option>${state.teamHub.lineups.map(l => `<option value="${esc(l.id)}" ${l.id === active ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}`;
}

function renderLineupBuilderHtml(state = getState()) {
  ensureLineupBuilderState(state);
  const summary = summarizeLineCompleteness(state);
  const active = state.teamHub.lineups.find(l => l.id === state.teamHub.lineupBuilder.activeLineupId);
  const label = active?.label || currentGameLabel(state);
  const notes = state.teamHub.lineupBuilder.notes || active?.notes || '';
  return `<div class="panel coach-panel lineup-builder-panel">
    <div class="panel-title"><span>Game Lineup Builder</span><span class="count">${summary.filled}/${summary.total} slots</span></div>
    <div class="teamhub-muted">Build lines in the slots below, then save a game-specific lineup card with scratches, absences, notes, PP/PK tags, and printable/shareable output.</div>
    <div class="field-row cols-2">
      <div><label>Saved Lineups</label><select id="lineupSavedSelect" onchange="this.value && BearDenHQ.loadSavedLineup(this.value)">${renderSavedLineupOptions(state)}</select></div>
      <div><label>Game Label</label><input id="lineupGameLabel" value="${esc(label)}" placeholder="2026-01-12 vs Stowe"></div>
    </div>
    <div class="field"><label>Coach / Manager Notes</label><textarea id="lineupNotes" rows="2" oninput="BearDenHQ.updateLineupNotes(this.value)" placeholder="Goalie rotation, scratches, special teams, matchups...">${esc(notes)}</textarea></div>
    <div class="btn-row">
      <button class="btn primary" onclick="BearDenHQ.saveCurrentLineup()">Save Game Lineup</button>
      <button class="btn" onclick="BearDenHQ.printCurrentLineup()">Print Lineup Card</button>
      <button class="btn" onclick="BearDenHQ.copyCurrentLineupText()">Copy Share Text</button>
      <button class="btn danger" onclick="BearDenHQ.deleteActiveLineup()">Delete Saved</button>
    </div>
    <div class="teamhub-metrics"><div><strong>${summary.pct}%</strong><span>Complete</span></div><div><strong>${asArray(state.teamHub.lineups).length}</strong><span>Saved cards</span></div><div><strong>${Object.keys(state.teamHub.lineupBuilder.scratchReason).length}</strong><span>Out/Scratch</span></div></div>
    <details class="lineup-details"><summary>Scratches / Absent / Injured</summary>${renderUnavailablePanel(state)}</details>
    <details class="lineup-details"><summary>Preview lineup card</summary><div id="lineupCardPreview">${renderPrintableLineupHtml(state, buildLineupSnapshot(state, { label, notes }), { embedded: true })}</div></details>
  </div>`;
}

function renderPrintableLineupHtml(state, lineup, opts = {}) {
  const reasons = lineup.scratchReason || {};
  const outPlayers = Object.entries(reasons).map(([id, reason]) => ({ p: playerById(state, id), reason })).filter(x => x.p);
  return `<div class="lineup-print-card ${opts.embedded ? 'embedded' : ''}">
    <div class="lineup-print-header"><div><h2>${esc(lineup.label || 'Game Lineup')}</h2><p>${esc(lineup.date || '')} ${lineup.opponent ? `· ${esc(lineup.homeAway === 'A' ? '@' : 'vs')} ${esc(lineup.opponent)}` : ''}</p></div><div><strong>${esc(state.teamBranding?.teamName || state.teamHub?.teamName || state.teamName || 'BenchBoss Coach HQ')}</strong><p>${esc(lineup.rink || '')}</p></div></div>
    ${renderLineTable(state, lineup.lines)}
    ${outPlayers.length ? `<h4>Scratches / Absent</h4><ul>${outPlayers.map(x => `<li>#${esc(x.p.num)} ${esc(x.p.name)} — ${esc(x.reason)}</li>`).join('')}</ul>` : ''}
    ${lineup.notes ? `<h4>Notes</h4><p>${esc(lineup.notes).replace(/\n/g, '<br>')}</p>` : ''}
  </div>`;
}

function currentLineupForOutput(state = getState()) {
  ensureLineupBuilderState(state);
  const selectedId = document.getElementById('lineupSavedSelect')?.value || state.teamHub.lineupBuilder.activeLineupId || '';
  const saved = state.teamHub.lineups.find(l => l.id === selectedId);
  if (saved) return saved;
  return buildLineupSnapshot(state, {
    label: document.getElementById('lineupGameLabel')?.value?.trim() || currentGameLabel(state),
    notes: document.getElementById('lineupNotes')?.value || state.teamHub.lineupBuilder.notes || '',
  });
}

function lineupText(state, lineup) {
  const cfg = window.LINE_CONFIG || {};
  const lines = [];
  lines.push(lineup.label || 'Game Lineup');
  lines.push('');
  ['fwd','def','goal'].forEach(type => {
    lineKeys(type).forEach(id => {
      const c = cfg[id];
      const players = asArray(lineup.lines?.[id]?.players).map(pid => playerLabel(state, pid)).join(' | ');
      if (players.replace(/[—|\s]/g, '')) lines.push(`${c.label}: ${players}`);
    });
    lines.push('');
  });
  const out = Object.entries(lineup.scratchReason || {}).map(([id, reason]) => `${playerLabel(state, id)} - ${reason}`);
  if (out.length) lines.push(`Out/Scratch: ${out.join('; ')}`);
  if (lineup.notes) lines.push(`Notes: ${lineup.notes}`);
  return lines.join('\n');
}

function printCurrentLineup(state = getState()) {
  const lineup = currentLineupForOutput(state);
  const html = renderPrintableLineupHtml(state, lineup);
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { window.toast?.('Popup blocked. Allow popups to print.'); return; }
  w.document.write(`<!doctype html><html><head><title>${esc(lineup.label)}</title><style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:24px;color:#111}.lineup-print-card{max-width:900px;margin:auto}.lineup-print-header{display:flex;justify-content:space-between;border-bottom:2px solid #111;margin-bottom:16px}.lineup-table{width:100%;border-collapse:collapse;margin:6px 0 12px}.lineup-table td{border:1px solid #bbb;padding:10px;width:20%;vertical-align:top}.lineup-pos{display:block;font-size:11px;text-transform:uppercase;color:#555}.pill{border:1px solid #888;border-radius:999px;padding:2px 6px;font-size:10px;margin-left:4px}.lineup-line-title{font-weight:700;margin-top:8px}h2{margin:0}p{margin:4px 0 10px}@media print{button{display:none}}
  </style></head><body>${html}<button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
}

async function copyCurrentLineupText(state = getState()) {
  const lineup = currentLineupForOutput(state);
  const text = lineupText(state, lineup);
  try {
    await navigator.clipboard.writeText(text);
    window.toast?.('Lineup copied to clipboard');
  } catch (_) {
    window.prompt('Copy lineup text:', text);
  }
}

function updateLineupNotes(value, state = getState()) {
  ensureLineupBuilderState(state);
  state.teamHub.lineupBuilder.notes = value;
  if (typeof window.save === 'function') window.save();
}

function deleteActiveLineup(state = getState()) {
  const id = document.getElementById('lineupSavedSelect')?.value || state.teamHub?.lineupBuilder?.activeLineupId;
  if (!id) { window.toast?.('Pick a saved lineup first'); return; }
  deleteSavedLineup(id, state);
}

function hydrateLineupBuilder(state = getState()) {
  ensureLineupBuilderState(state);
  const mount = document.getElementById('lineupBuilderMount');
  if (mount) mount.innerHTML = renderLineupBuilderHtml(state);
  const gdSelect = document.getElementById('gdLineConfig');
  if (gdSelect && state.teamHub?.lineups?.length) {
    const existing = new Set(Array.from(gdSelect.options).map(o => o.value));
    state.teamHub.lineups.forEach(l => {
      const key = `lineup:${l.id}`;
      if (!existing.has(key)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `Lineup Card: ${l.label}`;
        gdSelect.appendChild(opt);
      }
    });
  }
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  LINEUP_BUILDER_VERSION,
  ensureLineupBuilderState,
  renderLineupBuilderHtml,
  hydrateLineupBuilder,
  saveCurrentLineup,
  loadSavedLineup,
  deleteSavedLineup,
  deleteActiveLineup,
  setLineupScratchReason: setScratchReason,
  updateLineupNotes,
  printCurrentLineup,
  copyCurrentLineupText,
  renderPrintableLineupHtml,
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.state) hydrateLineupBuilder(window.state);
});
