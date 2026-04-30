// src/features/game-day/game-day.js
// -----------------------------------------------------------------------------
// Game Day Packet and Weekly Update for BenchBoss Coach HQ.
//
// Loaded as a NON-module classic script before the inline <script> in
// app.html so its declarations are visible by bare name.
//
// Refactor step 4 of HUMAN_LAUNCH_PLAN §7.
//
// Depends on globals provided elsewhere:
//   state, save()                  <- src/features/app/app-state.js
//   computeSkaterStats             <- src/features/roster/roster.js (stats)
//   LINE_CONFIG, TAGS              <- app.html (domain constants)
//   toast, escapeHtml,
//   formatDateShort, formatTime    <- app.html (utilities)
//   navTo                          <- app.html (navigation)
// -----------------------------------------------------------------------------

// ============================================
// GAME DAY PACKET
// ============================================
function saveGameDay() {
  state.gameDay.opponent = document.getElementById('gdOpponent').value;
  state.gameDay.date = document.getElementById('gdDate').value;
  state.gameDay.puck = document.getElementById('gdPuck').value;
  state.gameDay.homeAway = document.getElementById('gdHA').value;
  state.gameDay.rink = document.getElementById('gdRink').value;
  state.gameDay.jersey = document.getElementById('gdJersey').value;
  state.gameDay.arrival = document.getElementById('gdArrival').value;
  state.gameDay.lineConfig = document.getElementById('gdLineConfig').value;
  state.gameDay.keyPlayers = document.getElementById('gdKeyPlayers').value;
  state.gameDay.tendencies = document.getElementById('gdTendencies').value;
  state.gameDay.matchups = document.getElementById('gdMatchups').value;
  state.gameDay.coachPoints = document.getElementById('gdCoachPoints').value;
  save();
}

function renderGameDayPacket() {
  document.getElementById('gdOpponent').value = state.gameDay.opponent;
  document.getElementById('gdDate').value = state.gameDay.date;
  document.getElementById('gdPuck').value = state.gameDay.puck;
  document.getElementById('gdHA').value = state.gameDay.homeAway;
  document.getElementById('gdRink').value = state.gameDay.rink;
  document.getElementById('gdJersey').value = state.gameDay.jersey;
  document.getElementById('gdArrival').value = state.gameDay.arrival;
  document.getElementById('gdKeyPlayers').value = state.gameDay.keyPlayers;
  document.getElementById('gdTendencies').value = state.gameDay.tendencies;
  document.getElementById('gdMatchups').value = state.gameDay.matchups;
  document.getElementById('gdCoachPoints').value = state.gameDay.coachPoints;
  saveGameDay();
  renderConfigSelect();

  let h2hHtml = '';
  if (state.gameDay.opponent) {
    const h2h = state.games.filter(g => (g.opponent || '').toLowerCase().includes(state.gameDay.opponent.toLowerCase()));
    if (h2h.length > 0) {
      let w=0, l=0, t=0;
      h2h.forEach(g => {
        if (g.scoreFor > g.scoreAgainst) w++;
        else if (g.scoreFor < g.scoreAgainst) l++;
        else t++;
      });
      h2hHtml = `<h3>vs ${escapeHtml(state.gameDay.opponent)}</h3><p style="background: #e6f7f8; padding: 10px; border-left: 4px solid var(--teal)"><strong>Head-to-Head: ${w}-${l}-${t}</strong> in ${h2h.length} meeting${h2h.length > 1 ? 's' : ''} this season</p>`;
    }
  }

  const preview = document.getElementById('gdPreview');
  const gd = state.gameDay;
  const ha = gd.homeAway === 'H' ? 'VS' : '@';

  let activeLines = state.lines;
  if (gd.lineConfig && state.configs[gd.lineConfig]) activeLines = state.configs[gd.lineConfig];

  const lineupHtml = Object.keys(LINE_CONFIG).map(lineId => {
    const config = LINE_CONFIG[lineId];
    const line = activeLines[lineId];
    if (!line) return '';
    const names = line.players.map(pid => {
      const p = state.roster.find(x => x.id === pid);
      return p ? `#${p.num || '-'} ${p.name.split(' ').pop()}` : '—';
    }).join(' · ');
    const tags = (line.tags || []).length > 0 ? ` [${line.tags.map(t => t.toUpperCase()).join(',')}]` : '';
    return `<div style="margin-bottom: 4px"><strong>${config.label}:</strong> ${escapeHtml(names)}${tags}</div>`;
  }).join('');

  preview.innerHTML = `
    <div class="packet-preview">
      <div class="cover-title">GAME DAY</div>
      <div style="text-align: center; color: var(--teal-dim); font-family: 'Bebas Neue'; font-size: 18px; letter-spacing: 2px; margin-bottom: 8px">BLACK BEARS U10 T2</div>
      <div style="text-align: center; color: #666; font-size: 12px; margin-bottom: 6px">${ha}</div>
      <div class="cover-opp">${escapeHtml(gd.opponent || 'OPPONENT TBD').toUpperCase()}</div>
      <div class="cover-meta">
        ${gd.date ? formatDateShort(gd.date) : 'Date TBD'}
        ${gd.puck ? ' · ' + formatTime(gd.puck) : ''}
        ${gd.rink ? '<br>' + escapeHtml(gd.rink) : ''}
      </div>
      <h3>Lineup${gd.lineConfig ? ' — ' + escapeHtml(gd.lineConfig) : ''}</h3>
      <div style="font-size: 11px">${lineupHtml}</div>
      ${h2hHtml}
      ${gd.keyPlayers ? `<h3>Key Players</h3><p style="white-space: pre-wrap">${escapeHtml(gd.keyPlayers)}</p>` : ''}
      ${gd.tendencies ? `<h3>Tendencies</h3><p style="white-space: pre-wrap">${escapeHtml(gd.tendencies)}</p>` : ''}
      ${gd.matchups ? `<h3>Matchups</h3><p style="white-space: pre-wrap">${escapeHtml(gd.matchups)}</p>` : ''}
      ${gd.coachPoints ? `<h3>Coaching Points</h3><p style="white-space: pre-wrap">${escapeHtml(gd.coachPoints)}</p>` : ''}
      <h3>Logistics</h3>
      <p>
        ${gd.arrival ? `<strong>Arrival:</strong> ${formatTime(gd.arrival)}<br>` : ''}
        ${gd.puck ? `<strong>Puck Drop:</strong> ${formatTime(gd.puck)}<br>` : ''}
        <strong>Jersey:</strong> ${escapeHtml(gd.jersey)}
      </p>
    </div>
  `;
}

// ============================================
// WEEKLY UPDATE
// ============================================
function renderWeekly() {
  const w = state.weekly;
  w.weekOf = document.getElementById('wkDate').value;
  w.weekNum = document.getElementById('wkNum').value;
  w.practiceA.date = document.getElementById('wkPracADate').value;
  w.practiceA.theme = document.getElementById('wkPracATheme').value;
  w.practiceA.work = document.getElementById('wkPracAWork').value;
  w.practiceB.date = document.getElementById('wkPracBDate').value;
  w.practiceB.theme = document.getElementById('wkPracBTheme').value;
  w.practiceB.work = document.getElementById('wkPracBWork').value;
  w.potw.name = document.getElementById('wkPOTW').value;
  w.potw.num = document.getElementById('wkPOTWNum').value;
  w.potw.category = document.getElementById('wkPOTWCat').value;
  w.potw.reason = document.getElementById('wkPOTWReason').value;
  w.reminders = document.getElementById('wkReminders').value;
  save();

  const weekLabel = w.weekOf ? new Date(w.weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'TBD';
  const subject = `Black Bears U10 T2 — ${w.weekNum ? 'Week ' + w.weekNum + ' — ' : ''}Week of ${weekLabel}`;

  let html = `<div class="subject-line"><strong>Subject:</strong> ${escapeHtml(subject)}</div>`;
  html += `<p>Hi Black Bears families,</p>`;
  html += `<p>Hope everyone had a great week! Here's what's been happening on and off the ice.</p>`;

  const hasA = w.practiceA.date || w.practiceA.theme || w.practiceA.work;
  const hasB = w.practiceB.date || w.practiceB.theme || w.practiceB.work;
  if (hasA || hasB) {
    html += `<h3>🏒 This Week on the Ice</h3>`;
    if (hasA) {
      html += `<p><strong>Practice A${w.practiceA.date ? ' (' + escapeHtml(w.practiceA.date) + ')' : ''}</strong>`;
      if (w.practiceA.theme) html += ` — <em>${escapeHtml(w.practiceA.theme)}</em>`;
      if (w.practiceA.work) html += `<br>${escapeHtml(w.practiceA.work)}`;
      html += `</p>`;
    }
    if (hasB) {
      html += `<p><strong>Practice B${w.practiceB.date ? ' (' + escapeHtml(w.practiceB.date) + ')' : ''}</strong>`;
      if (w.practiceB.theme) html += ` — <em>${escapeHtml(w.practiceB.theme)}</em>`;
      if (w.practiceB.work) html += `<br>${escapeHtml(w.practiceB.work)}`;
      html += `</p>`;
    }
  }

  if (w.potw.name) {
    const nameLine = w.potw.num ? `#${w.potw.num} ${w.potw.name}` : w.potw.name;
    html += `<div class="potw">
      <div class="potw-label">⭐ Player of the Week ⭐</div>
      <div class="potw-name">${escapeHtml(nameLine)}</div>
      ${w.potw.category ? `<div class="potw-cat">${escapeHtml(w.potw.category)}</div>` : ''}
      ${w.potw.reason ? `<p style="margin-top: 8px; margin-bottom: 0">${escapeHtml(w.potw.reason).replace(/\n/g, '<br>')}</p>` : ''}
    </div>`;
  }

  const remItems = (w.reminders || '').split('\n').filter(r => r.trim());
  if (remItems.length > 0) {
    html += `<h3>📋 Reminders</h3><ul>${remItems.map(r => `<li>${escapeHtml(r.trim())}</li>`).join('')}</ul>`;
  }
  html += `<p style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #ddd; font-style: italic">Go Bears!<br>— Coach Tristan</p>`;
  document.getElementById('wkPreview').innerHTML = html;
}

function populateWeeklyForm() {
  const w = state.weekly || {};
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  };
  setValue('wkDate', w.weekOf);
  setValue('wkNum', w.weekNum);
  setValue('wkPracADate', w.practiceA?.date);
  setValue('wkPracATheme', w.practiceA?.theme);
  setValue('wkPracAWork', w.practiceA?.work);
  setValue('wkPracBDate', w.practiceB?.date);
  setValue('wkPracBTheme', w.practiceB?.theme);
  setValue('wkPracBWork', w.practiceB?.work);
  setValue('wkPOTW', w.potw?.name);
  setValue('wkPOTWNum', w.potw?.num);
  setValue('wkPOTWCat', w.potw?.category);
  setValue('wkPOTWReason', w.potw?.reason);
  setValue('wkReminders', w.reminders);
}

function buildWeeklyPlainText() {
  const w = state.weekly;
  const weekLabel = w.weekOf ? new Date(w.weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'TBD';
  let out = `Hi Black Bears families,\n\nHope everyone had a great week!`;

  const hasA = w.practiceA.date || w.practiceA.theme || w.practiceA.work;
  const hasB = w.practiceB.date || w.practiceB.theme || w.practiceB.work;
  if (hasA || hasB) {
    out += `\n\nTHIS WEEK ON THE ICE`;
    if (hasA) {
      out += `\n\nPractice A${w.practiceA.date ? ' (' + w.practiceA.date + ')' : ''}${w.practiceA.theme ? ' - ' + w.practiceA.theme : ''}`;
      if (w.practiceA.work) out += `\n${w.practiceA.work}`;
    }
    if (hasB) {
      out += `\n\nPractice B${w.practiceB.date ? ' (' + w.practiceB.date + ')' : ''}${w.practiceB.theme ? ' - ' + w.practiceB.theme : ''}`;
      if (w.practiceB.work) out += `\n${w.practiceB.work}`;
    }
  }
  if (w.potw.name) {
    const nameLine = w.potw.num ? `#${w.potw.num} ${w.potw.name}` : w.potw.name;
    out += `\n\n⭐ PLAYER OF THE WEEK ⭐\n${nameLine}`;
    if (w.potw.category) out += `\nCategory: ${w.potw.category}`;
    if (w.potw.reason) out += `\n\n${w.potw.reason}`;
  }
  const remItems = (w.reminders || '').split('\n').filter(r => r.trim());
  if (remItems.length > 0) {
    out += `\n\nREMINDERS\n`;
    remItems.forEach(r => out += `\n• ${r.trim()}`);
  }
  out += `\n\nGo Bears!\n— Coach Tristan`;
  return { subject: `Black Bears U10 T2 — ${w.weekNum ? 'Week ' + w.weekNum + ' — ' : ''}Week of ${weekLabel}`, body: out };
}

function copyWeeklyUpdate() {
  const { subject, body } = buildWeeklyPlainText();
  const full = `Subject: ${subject}\n\n${body}`;
  navigator.clipboard.writeText(full).then(() => toast('Copied!')).catch(() => toast('Copy failed'));
}

function openWeeklyInEmail() {
  const { subject, body } = buildWeeklyPlainText();
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

