// BenchBoss Coach HQ v0.6.0 — Parent Portal
// Authenticated view-only team page for parents/players/viewers.

import { requireAuthenticatedPage } from '../auth/session.js';
import { loadProductionTeamHubData, getProductionTeamContext, acceptTeamInvite } from './production-team-store.js';
import { initMonitoring } from '../../lib/monitoring.js';
import { initAnalytics, trackEvent } from '../../lib/analytics.js';

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function fmtDate(value) { if (!value) return ''; const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

function playerName(row) { return row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Player'; }
function sourceUrl(data, type, externalId) { return asArray(data.sources).find(s => s.source_type === type && s.external_id === externalId)?.url || ''; }

function renderLineup(lineup, playersById) {
  if (!lineup) return '<div class="empty">No lineup has been published yet.</div>';
  const lines = lineup.data?.lines || {};
  const groups = Object.entries(lines).map(([key, value]) => {
    const names = asArray(value.players).map(id => {
      const player = playersById.get(id) || playersById.get(String(id));
      return player ? `#${esc(player.jersey_number || '')} ${esc(playerName(player))}` : 'Open';
    });
    return `<div class="line-card"><strong>${esc(key)}</strong><span>${names.join(' · ')}</span></div>`;
  }).join('');
  return `<div class="section-sub">${esc(lineup.game_label || '')} ${lineup.game_date ? `· ${esc(fmtDate(lineup.game_date))}` : ''}</div><div class="line-grid">${groups}</div>`;
}

function renderPractices(practices) {
  const rows = asArray(practices).filter(p => p.status === 'published').slice(0, 5);
  if (!rows.length) return '<div class="empty">No practices have been published to parents yet.</div>';
  return rows.map(plan => {
    const blocks = asArray(plan.data?.blocks);
    return `<div class="practice-card"><div><strong>${esc(plan.title)}</strong><span>${esc(fmtDate(plan.practice_date))} · ${blocks.length} blocks</span></div><details><summary>View drills</summary>${blocks.map(block => `<p><b>${esc(block.label || 'Block')}</b> — ${esc(block.objective || block.coachNote || block.drillId || '')}</p>`).join('')}</details></div>`;
  }).join('');
}

function renderStats(imports) {
  const latest = asArray(imports)[0];
  if (!latest) return '<div class="empty">GameSheet stats have not been imported yet.</div>';
  const stats = latest.payload?.playerStats || latest.payload?.player_stats || [];
  const teamStats = latest.team_stats || {};
  return `<div class="stat-summary"><div><strong>${esc(teamStats.record || '—')}</strong><span>Record</span></div><div><strong>${esc(latest.games_count || 0)}</strong><span>Games</span></div><div><strong>${esc(latest.player_stats_count || stats.length || 0)}</strong><span>Skaters</span></div></div>${stats.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>PTS</th><th>G</th><th>A</th></tr></thead><tbody>${stats.slice(0, 12).map(p => `<tr><td>${esc(p.num || '')}</td><td>${esc(p.name || '')}</td><td>${esc(p.pts || 0)}</td><td>${esc(p.g || 0)}</td><td>${esc(p.a || 0)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

function applyBrand(team) {
  const primary = team.brand_primary_color || '#7dd3d8';
  const secondary = team.brand_secondary_color || '#f4cf57';
  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--secondary', secondary);
  document.documentElement.style.setProperty('--bg', team.brand_background_color || '#0a0a0a');
  const logo = document.getElementById('portalLogo');
  if (logo && team.logo_url) logo.innerHTML = `<img src="${esc(team.logo_url)}" alt="Team logo">`;
  else if (logo) logo.textContent = esc(team.brand_monogram || 'BB');
}

async function init() {
  initMonitoring();
  initAnalytics();
  await requireAuthenticatedPage();
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (inviteToken) {
    try { await acceptTeamInvite(inviteToken); } catch (error) { console.warn('Invite accept failed:', error); }
  }
  const mount = document.getElementById('parentPortalMount');
  try {
    const ctx = await getProductionTeamContext();
    if (!ctx.ready) throw new Error(ctx.error || 'No team membership found for this account.');
    const data = await loadProductionTeamHubData();
    applyBrand(ctx.team);
    const playersById = new Map(asArray(data.players).map(p => [p.source_player_id || p.id, p]));
    const publishedLineup = asArray(data.lineups).find(l => l.status === 'published');
    const chatUrl = sourceUrl(data, 'sportsengine', 'chat');
    const rosterUrl = sourceUrl(data, 'sportsengine', 'roster');
    const scheduleUrl = sourceUrl(data, 'sportsengine', 'schedule');
    const publishedRecaps = asArray(data.practices).filter(p => p.status === 'published' && p.data?.recap);
    trackEvent('parent_recap_viewed', {
      teamId: ctx.team?.id || null,
      recaps: publishedRecaps.length,
      practices: asArray(data.practices).filter(p => p.status === 'published').length,
      hasLineup: Boolean(asArray(data.lineups).find(l => l.status === 'published')),
    });
    document.getElementById('portalTeamName').textContent = ctx.team.name || 'Team Portal';
    document.getElementById('portalOrgName').textContent = ctx.organization?.name || 'BenchBoss';
    mount.innerHTML = `
      <section class="hero"><div><p>Parent Portal</p><h1>${esc(ctx.team.name || 'Team')}</h1><span>${esc(ctx.organization?.name || '')} · ${esc(ctx.role || 'member')}</span></div><div class="quick-links">${chatUrl ? `<a href="${esc(chatUrl)}" target="_blank" rel="noreferrer">SportsEngine Chat</a>` : ''}${scheduleUrl ? `<a href="${esc(scheduleUrl)}" target="_blank" rel="noreferrer">Schedule</a>` : ''}${rosterUrl ? `<a href="${esc(rosterUrl)}" target="_blank" rel="noreferrer">Roster</a>` : ''}</div></section>
      <section class="grid"><article><h2>Published Lineup</h2>${renderLineup(publishedLineup, playersById)}</article><article><h2>GameSheet Snapshot</h2>${renderStats(data.imports)}</article></section>
      <section><h2>Published Practices & Drills</h2>${renderPractices(data.practices)}</section>
      <section><h2>Team Roster</h2><div class="roster-grid">${asArray(data.players).map(p => `<div class="player"><strong>#${esc(p.jersey_number || '')}</strong><span>${esc(playerName(p))}</span><em>${esc(p.position || '')}</em></div>`).join('')}</div></section>
    `;
  } catch (error) {
    mount.innerHTML = `<section class="error"><h2>Could not load team portal</h2><p>${esc(error.message || error)}</p><a href="./app.html">Back to app</a></section>`;
  }
}

init();
