// src/features/roster/roster.js
// -----------------------------------------------------------------------------
// Roster, lines, stats, and games for BenchBoss Coach HQ.
//
// Loaded as a NON-module classic script before the inline <script> in
// app.html so its `function` declarations are visible by bare name.
//
// Refactor step 2 of HUMAN_LAUNCH_PLAN §7. Includes:
//   ROSTER (players)   addPlayer, sortRoster, deletePlayer, updatePlayerNum,
//                      cyclePlayerPos, renderRoster, populateRosterDatalist
//   LINES              renderLines, renderLineRow, toggleTag,
//                      openPlayerPicker, closePlayerPicker, pickPlayer,
//                      clearSlotFromPicker, clearLines,
//                      saveConfig, loadConfig, renderConfigSelect
//   STATS              computeSkaterStats, computeGoalieStats, renderStats
//   GAMES              renderGamesList, openGameEntry, closeGameEntry,
//                      renderGameEntryTables, saveGameFromEntry,
//                      deleteGameFromEntry
//
// Depends on globals provided elsewhere:
//   state, save()                  ← src/features/app/app-state.js
//   LINE_CONFIG, TAGS, TAG_LABELS  ← app.html (domain constants)
//   toast, escapeHtml,
//   formatDateShort, renderDashboard ← app.html (utilities and cross-module)
// -----------------------------------------------------------------------------

// ROSTER
// ============================================
function addPlayer() {
  const num = document.getElementById('rosterNum').value.trim();
  const name = document.getElementById('rosterName').value.trim();
  const pos = document.getElementById('rosterPos').value;
  if (!name) { toast('Enter a name'); return; }
  state.roster.push({ id: crypto.randomUUID(), num, name, pos });
  sortRoster();
  document.getElementById('rosterNum').value = '';
  document.getElementById('rosterName').value = '';
  document.getElementById('rosterNum').focus();
  save();
  renderRoster();
}

function sortRoster() {
  state.roster.sort((a, b) => {
    if (a.pos === 'G' && b.pos !== 'G') return 1;
    if (b.pos === 'G' && a.pos !== 'G') return -1;
    const ai = parseInt(a.num) || 999;
    const bi = parseInt(b.num) || 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function deletePlayer(id) {
  const p = state.roster.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Remove ${p.name}? This also removes their stats from every game.`)) return;
  state.roster = state.roster.filter(x => x.id !== id);
  state.games.forEach(g => {
    if (g.skaters) delete g.skaters[id];
    if (g.goalies) delete g.goalies[id];
  });
  Object.keys(state.lines).forEach(lineId => {
    state.lines[lineId].players = state.lines[lineId].players.map(pid => pid === id ? null : pid);
  });
  save();
  renderRoster();
}

function updatePlayerNum(id, value) {
  const p = state.roster.find(x => x.id === id);
  if (!p) return;
  p.num = value.trim();
  save();
}

function cyclePlayerPos(id) {
  const p = state.roster.find(x => x.id === id);
  if (!p) return;
  const order = ['F', 'D', 'G'];
  const idx = order.indexOf(p.pos);
  p.pos = order[(idx + 1) % order.length];
  // Remove from lines if pos changed
  Object.keys(state.lines).forEach(lineId => {
    state.lines[lineId].players = state.lines[lineId].players.map(pid => pid === id ? null : pid);
  });
  sortRoster();
  save();
  renderRoster();
}

function renderRoster() {
  document.getElementById('rosterCountBadge').textContent = state.roster.length;
  const list = document.getElementById('rosterList');
  if (state.roster.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">◆</div>No players yet</div>`;
    return;
  }
  list.innerHTML = state.roster.map(p => `
    <div class="player-card ${p.pos === 'G' ? 'goalie-card' : ''}">
      <input type="text" class="num-input" value="${escapeHtml(p.num)}" maxlength="2" onchange="updatePlayerNum('${p.id}', this.value)" placeholder="#">
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="pos" onclick="cyclePlayerPos('${p.id}')">${p.pos}</div>
      <button class="del" onclick="deletePlayer('${p.id}')">✕</button>
    </div>
  `).join('');
}

function populateRosterDatalist() {
  const dl = document.getElementById('rosterNames');
  if (dl) {
    dl.innerHTML = state.roster.map(p => `<option value="${escapeHtml(p.name)}">`).join('');
  }
}

// ============================================
// LINES
// ============================================
function renderLines() {
  const fwdList = Object.keys(LINE_CONFIG).filter(k => LINE_CONFIG[k].type === 'fwd');
  const defList = Object.keys(LINE_CONFIG).filter(k => LINE_CONFIG[k].type === 'def');
  document.getElementById('forwardLines').innerHTML = fwdList.map(renderLineRow).join('');
  document.getElementById('defLines').innerHTML = defList.map(renderLineRow).join('');
  document.getElementById('goalieLine').innerHTML = renderLineRow('G');
  renderConfigSelect();
}

function renderLineRow(lineId) {
  const config = LINE_CONFIG[lineId];
  const line = state.lines[lineId];
  const tagClasses = line.tags.map(t => `has-${t}`).join(' ');
  const slots = config.positions.map((pos, idx) => {
    const playerId = line.players[idx];
    const player = playerId ? state.roster.find(p => p.id === playerId) : null;
    return `
      <div class="slot ${player ? 'filled' : ''}" onclick="openPlayerPicker('${lineId}', ${idx})">
        <div class="pos-tag">${pos}</div>
        ${player
          ? `<div class="slot-num">#${player.num || '-'}</div><div class="slot-name">${escapeHtml(player.name.split(' ').pop())}</div>`
          : `<div class="slot-empty">+</div>`
        }
      </div>
    `;
  }).join('');

  const tags = TAGS.map(tag => {
    const isActive = line.tags.includes(tag);
    return `<button class="tag-btn ${tag} ${isActive ? 'active' : ''}" onclick="toggleTag('${lineId}', '${tag}')">${TAG_LABELS[tag]}</button>`;
  }).join('');

  return `
    <div class="line-row ${tagClasses}">
      <div class="line-label">
        <span>${config.label}</span>
        <div class="line-tags-row">${tags}</div>
      </div>
      <div class="line-slots slots-${config.positions.length}">${slots}</div>
    </div>
  `;
}

function toggleTag(lineId, tag) {
  const tags = state.lines[lineId].tags;
  const i = tags.indexOf(tag);
  if (i >= 0) tags.splice(i, 1);
  else tags.push(tag);
  save();
  renderLines();
}

function openPlayerPicker(lineId, idx) {
  state.ui.pickerContext = { lineId, idx };
  const line = state.lines[lineId];
  const config = LINE_CONFIG[lineId];
  const pos = config.positions[idx];
  document.getElementById('pickerTitle').textContent = `${config.label} — ${pos}`;

  let available;
  if (config.type === 'goal') available = state.roster.filter(p => p.pos === 'G');
  else available = state.roster.filter(p => p.pos !== 'G');

  document.getElementById('pickerOptions').innerHTML = available.map(p => {
    let placedElsewhere = false;
    Object.keys(state.lines).forEach(lId => {
      state.lines[lId].players.forEach((pid, pIdx) => {
        if (pid === p.id && !(lId === lineId && pIdx === idx)) placedElsewhere = true;
      });
    });
    return `
      <button class="${placedElsewhere ? 'placed' : ''}" onclick="pickPlayer('${p.id}')">
        <div class="p-num">#${p.num || '-'}</div>
        <div class="p-name">${escapeHtml(p.name.split(' ').pop())}</div>
      </button>
    `;
  }).join('');

  if (available.length === 0) {
    document.getElementById('pickerOptions').innerHTML = `<div class="empty-state" style="grid-column: 1/-1">Add ${config.type === 'goal' ? 'a goalie' : 'skaters'} in Roster tab first</div>`;
  }
  document.getElementById('playerPickerModal').classList.add('show');
}

function closePlayerPicker() {
  document.getElementById('playerPickerModal').classList.remove('show');
  state.ui.pickerContext = null;
}

function pickPlayer(playerId) {
  const ctx = state.ui.pickerContext;
  if (!ctx) return;
  Object.keys(state.lines).forEach(lineId => {
    state.lines[lineId].players = state.lines[lineId].players.map((pid, i) => {
      if (pid === playerId && !(lineId === ctx.lineId && i === ctx.idx)) return null;
      return pid;
    });
  });
  state.lines[ctx.lineId].players[ctx.idx] = playerId;
  save();
  closePlayerPicker();
  renderLines();
}

function clearSlotFromPicker() {
  const ctx = state.ui.pickerContext;
  if (!ctx) return;
  state.lines[ctx.lineId].players[ctx.idx] = null;
  save();
  closePlayerPicker();
  renderLines();
}

function clearLines() {
  if (!confirm('Clear all line assignments?')) return;
  Object.keys(state.lines).forEach(lineId => {
    state.lines[lineId].players = state.lines[lineId].players.map(() => null);
    state.lines[lineId].tags = [];
  });
  save();
  renderLines();
  toast('Lines cleared');
}

function saveConfig() {
  const name = document.getElementById('saveConfigName').value.trim();
  if (!name) { toast('Enter a config name'); return; }
  state.configs[name] = JSON.parse(JSON.stringify(state.lines));
  document.getElementById('saveConfigName').value = '';
  save();
  renderConfigSelect();
  toast(`Saved "${name}"`);
}

function loadConfig(name) {
  if (!name || !state.configs[name]) return;
  state.lines = JSON.parse(JSON.stringify(state.configs[name]));
  save();
  renderLines();
  document.getElementById('loadConfigSelect').value = '';
  toast(`Loaded "${name}"`);
}

function renderConfigSelect() {
  const select = document.getElementById('loadConfigSelect');
  select.innerHTML = '<option value="">— Pick —</option>' +
    Object.keys(state.configs).map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  const gdSelect = document.getElementById('gdLineConfig');
  if (gdSelect) {
    const current = state.gameDay.lineConfig || '';
    gdSelect.innerHTML = '<option value="">— Current lineup —</option>' +
      Object.keys(state.configs).map(name => `<option value="${escapeHtml(name)}" ${name === current ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
  }
}

// ============================================
// STATS
// ============================================
function computeSkaterStats(playerId) {
  const s = { gp: 0, g: 0, a: 0, pts: 0, plusMinus: 0, pim: 0, sog: 0 };
  state.games.forEach(game => {
    const line = game.skaters?.[playerId];
    if (line && (line.g || line.a || line.pim || line.sog || line.plusMinus || line.played)) {
      s.gp++;
      s.g += line.g || 0;
      s.a += line.a || 0;
      s.plusMinus += line.plusMinus || 0;
      s.pim += line.pim || 0;
      s.sog += line.sog || 0;
    }
  });
  s.pts = s.g + s.a;
  return s;
}

function computeGoalieStats(playerId) {
  const s = { gp: 0, w: 0, l: 0, t: 0, sa: 0, saves: 0, ga: 0, so: 0 };
  state.games.forEach(game => {
    const line = game.goalies?.[playerId];
    if (line && line.played) {
      s.gp++;
      s.sa += line.sa || 0;
      s.saves += line.saves || 0;
      const ga = (line.sa || 0) - (line.saves || 0);
      s.ga += ga;
      if (ga === 0 && line.sa > 0) s.so++;
      if (line.decision === 'W') s.w++;
      else if (line.decision === 'L') s.l++;
      else if (line.decision === 'T') s.t++;
    }
  });
  s.svpct = s.sa > 0 ? (s.saves / s.sa) : 0;
  s.gaa = s.gp > 0 ? (s.ga / s.gp) : 0;
  return s;
}

function renderStats() {
  const skaters = state.roster.filter(p => p.pos !== 'G');
  const rows = skaters.map(p => ({ player: p, stats: computeSkaterStats(p.id) }));
  const sort = state.ui.statSort;
  rows.sort((a, b) => {
    let va, vb;
    if (sort.key === 'num') { va = parseInt(a.player.num) || 99; vb = parseInt(b.player.num) || 99; }
    else if (sort.key === 'name') { va = a.player.name; vb = b.player.name; }
    else { va = a.stats[sort.key] || 0; vb = b.stats[sort.key] || 0; }
    if (va < vb) return sort.asc ? -1 : 1;
    if (va > vb) return sort.asc ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('skaterTbody');
  if (skaters.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="icon">◆</div>No skaters</td></tr>`;
  } else {
    tbody.innerHTML = rows.map(({ player, stats }) => `
      <tr>
        <td>#${player.num || '--'}</td>
        <td>${escapeHtml(player.name)}</td>
        <td>${stats.gp}</td>
        <td class="highlight-col">${stats.pts}</td>
        <td>${stats.g}</td>
        <td>${stats.a}</td>
        <td style="color: ${stats.plusMinus > 0 ? 'var(--win)' : stats.plusMinus < 0 ? 'var(--loss)' : 'var(--text-mid)'}">${stats.plusMinus > 0 ? '+' : ''}${stats.plusMinus}</td>
        <td>${stats.sog}</td>
      </tr>
    `).join('');
  }

  document.querySelectorAll('#page-stats thead th').forEach(th => {
    th.classList.remove('sorted', 'asc');
    if (th.dataset.sort === sort.key) {
      th.classList.add('sorted');
      if (sort.asc) th.classList.add('asc');
    }
  });

  const goalies = state.roster.filter(p => p.pos === 'G');
  const goalieTbody = document.getElementById('goalieTbody');
  if (goalies.length === 0) {
    goalieTbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="icon">◆</div>No goalie</td></tr>`;
  } else {
    goalieTbody.innerHTML = goalies.map(p => {
      const s = computeGoalieStats(p.id);
      return `
        <tr>
          <td>#${p.num || '--'}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${s.gp}</td>
          <td>${s.w}-${s.l}-${s.t}</td>
          <td class="highlight-col">${(s.svpct * 100).toFixed(1)}%</td>
          <td class="highlight-col">${s.gaa.toFixed(2)}</td>
          <td>${s.so}</td>
        </tr>
      `;
    }).join('');
  }
}

document.querySelectorAll('#page-stats thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (state.ui.statSort.key === key) state.ui.statSort.asc = !state.ui.statSort.asc;
    else { state.ui.statSort.key = key; state.ui.statSort.asc = false; }
    save();
    renderStats();
  });
});

// ============================================
// GAMES
// ============================================
function renderGamesList() {
  const container = document.getElementById('gameListContainer');
  if (state.games.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">◆</div>No games yet</div>`;
    return;
  }
  const sorted = [...state.games].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  container.innerHTML = sorted.map(g => {
    const result = g.scoreFor > g.scoreAgainst ? 'W' : g.scoreFor < g.scoreAgainst ? 'L' : 'T';
    const ha = g.homeAway === 'H' ? 'vs' : '@';
    return `
      <div class="game-card" onclick="openGameEntry('${g.id}')">
        <div class="top-row">
          <div class="date">${formatDateShort(g.date)}</div>
          <div class="result ${result.toLowerCase()}">${result} ${g.scoreFor}-${g.scoreAgainst}</div>
        </div>
        <div class="opp">${ha} ${escapeHtml(g.opponent || '—')}</div>
        <div class="meta">${g.gameType || 'League'}</div>
      </div>
    `;
  }).join('');
}

function openGameEntry(id = null) {
  state.ui.editingGameId = id;
  document.getElementById('gameEntryTitle').textContent = id ? 'Edit Game' : 'New Game';
  document.getElementById('geDeleteBtn').style.display = id ? 'inline-block' : 'none';

  if (id) {
    const game = state.games.find(g => g.id === id);
    document.getElementById('geOpponent').value = game.opponent || '';
    document.getElementById('geDate').value = game.date || '';
    document.getElementById('geHA').value = game.homeAway || 'H';
    document.getElementById('geSF').value = game.scoreFor || 0;
    document.getElementById('geSA').value = game.scoreAgainst || 0;
    document.getElementById('geType').value = game.gameType || 'League';
    renderGameEntryTables(game.skaters || {}, game.goalies || {});
  } else {
    document.getElementById('geOpponent').value = '';
    document.getElementById('geDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('geHA').value = 'H';
    document.getElementById('geSF').value = 0;
    document.getElementById('geSA').value = 0;
    document.getElementById('geType').value = 'League';
    renderGameEntryTables({}, {});
  }
  document.getElementById('gameEntryModal').classList.add('show');
}

function closeGameEntry() {
  document.getElementById('gameEntryModal').classList.remove('show');
  state.ui.editingGameId = null;
}

function renderGameEntryTables(skatersData, goaliesData) {
  const skaters = state.roster.filter(p => p.pos !== 'G');
  const goalies = state.roster.filter(p => p.pos === 'G');

  document.getElementById('geSkaters').innerHTML = skaters.length === 0
    ? `<div class="empty-state" style="padding: 20px">Add skaters first</div>`
    : skaters.map(p => {
        const d = skatersData[p.id] || {};
        return `
          <div style="background: var(--panel-hi); border: 1px solid var(--border); border-radius: 3px; padding: 10px; margin-bottom: 6px">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
              <span style="font-family: 'Bebas Neue'; font-size: 18px; color: var(--teal)">#${p.num || '-'}</span>
              <span style="flex: 1; font-size: 13px">${escapeHtml(p.name)}</span>
              <span style="font-size: 10px; color: var(--text-dim)">${p.pos}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px">
              <div><label style="font-size: 9px; color: var(--text-dim)">G</label><input type="number" data-pid="${p.id}" data-f="g" value="${d.g || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">A</label><input type="number" data-pid="${p.id}" data-f="a" value="${d.a || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">+/-</label><input type="number" data-pid="${p.id}" data-f="plusMinus" value="${d.plusMinus || 0}" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">PIM</label><input type="number" data-pid="${p.id}" data-f="pim" value="${d.pim || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">SOG</label><input type="number" data-pid="${p.id}" data-f="sog" value="${d.sog || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
            </div>
          </div>
        `;
      }).join('');

  document.getElementById('geGoalies').innerHTML = goalies.length === 0
    ? `<div class="empty-state" style="padding: 20px">No goalie on roster. Tap pos on a player in Roster to change to G.</div>`
    : goalies.map(p => {
        const d = goaliesData[p.id] || {};
        return `
          <div style="background: var(--panel-hi); border: 1px solid var(--border); border-radius: 3px; padding: 10px">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 13px">
                <input type="checkbox" data-pid="${p.id}" data-f="played" ${d.played ? 'checked' : ''} style="width: auto">
                <span>#${p.num || '-'} ${escapeHtml(p.name)}</span>
              </label>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px">
              <div><label style="font-size: 9px; color: var(--text-dim)">SA</label><input type="number" data-pid="${p.id}" data-f="sa" value="${d.sa || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">Saves</label><input type="number" data-pid="${p.id}" data-f="saves" value="${d.saves || 0}" min="0" style="padding: 6px; font-size: 13px; text-align: center"></div>
              <div><label style="font-size: 9px; color: var(--text-dim)">Dec</label>
                <select data-pid="${p.id}" data-f="decision" style="padding: 6px; font-size: 13px; text-align: center">
                  <option value="" ${!d.decision ? 'selected' : ''}>—</option>
                  <option value="W" ${d.decision === 'W' ? 'selected' : ''}>W</option>
                  <option value="L" ${d.decision === 'L' ? 'selected' : ''}>L</option>
                  <option value="T" ${d.decision === 'T' ? 'selected' : ''}>T</option>
                </select>
              </div>
            </div>
          </div>
        `;
      }).join('');
}

function saveGameFromEntry() {
  const opp = document.getElementById('geOpponent').value.trim();
  if (!opp) { toast('Enter opponent'); return; }

  const skaters = {};
  document.querySelectorAll('#geSkaters input').forEach(inp => {
    const pid = inp.dataset.pid;
    const f = inp.dataset.f;
    if (!skaters[pid]) skaters[pid] = { played: true };
    skaters[pid][f] = parseInt(inp.value) || 0;
  });
  Object.keys(skaters).forEach(pid => {
    const line = skaters[pid];
    if (!line.g && !line.a && !line.pim && !line.sog && !line.plusMinus) delete skaters[pid];
  });

  const goalies = {};
  document.querySelectorAll('#geGoalies input, #geGoalies select').forEach(el => {
    const pid = el.dataset.pid;
    const f = el.dataset.f;
    if (!goalies[pid]) goalies[pid] = {};
    if (el.type === 'checkbox') goalies[pid][f] = el.checked;
    else if (el.type === 'number') goalies[pid][f] = parseInt(el.value) || 0;
    else goalies[pid][f] = el.value;
  });
  Object.keys(goalies).forEach(pid => {
    if (!goalies[pid].played) delete goalies[pid];
  });

  const sf = parseInt(document.getElementById('geSF').value) || 0;
  const sa = parseInt(document.getElementById('geSA').value) || 0;
  Object.keys(goalies).forEach(gid => {
    if (!goalies[gid].decision) {
      if (sf > sa) goalies[gid].decision = 'W';
      else if (sf < sa) goalies[gid].decision = 'L';
      else goalies[gid].decision = 'T';
    }
  });

  const game = {
    id: state.ui.editingGameId || crypto.randomUUID(),
    date: document.getElementById('geDate').value,
    opponent: opp,
    homeAway: document.getElementById('geHA').value,
    gameType: document.getElementById('geType').value,
    scoreFor: sf,
    scoreAgainst: sa,
    skaters,
    goalies,
  };

  if (state.ui.editingGameId) {
    const idx = state.games.findIndex(g => g.id === state.ui.editingGameId);
    state.games[idx] = game;
    toast('Game updated');
  } else {
    state.games.push(game);
    toast('Game saved');
  }
  save();
  closeGameEntry();
  renderGamesList();
  renderStats();
  renderDashboard();
}

function deleteGameFromEntry() {
  if (!state.ui.editingGameId) return;
  if (!confirm('Delete this game?')) return;
  state.games = state.games.filter(g => g.id !== state.ui.editingGameId);
  save();
  closeGameEntry();
  renderGamesList();
  renderStats();
  toast('Game deleted');
}
