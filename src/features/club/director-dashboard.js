// BenchBoss Coach HQ v0.9.0 — Club Director Dashboard UI
// -----------------------------------------------------------------------------
// Renders the multi-team director view at club.html. Reads data via director-store.js.
// Designed to render without JavaScript framework dependencies — vanilla DOM updates.

import { requireAuthenticatedPage } from '../auth/session.js';
import { getDirectorContext, loadClubDashboardData, buildClubSummary, pushPracticeTemplate } from './director-store.js';

const STATUS_LABELS = {
  active: { label: 'Active', tone: 'good' },
  dormant: { label: 'Dormant', tone: 'warn' },
  setup: { label: 'Needs setup', tone: 'bad' },
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(iso) {
  if (!iso) return 'never';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const days = Math.round((now - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

function toast(message) {
  if (typeof window.toast === 'function') {
    window.toast(message);
  } else {
    console.log('[director]', message);
  }
}

// ---- Public init ---------------------------------------------------------

export async function initClubDirectorDashboard(rootSelector = '[data-club-root]') {
  await requireAuthenticatedPage();
  const root = document.querySelector(rootSelector);
  if (!root) {
    console.warn('Club director root not found:', rootSelector);
    return;
  }

  root.innerHTML = renderLoading();

  let ctx;
  try {
    ctx = await getDirectorContext();
  } catch (err) {
    root.innerHTML = renderError(err?.message || 'Failed to load director context');
    return;
  }

  if (!ctx.ready) {
    root.innerHTML = renderGate(ctx);
    return;
  }

  let data;
  try {
    data = await loadClubDashboardData(ctx.supabase, ctx.organization.id);
  } catch (err) {
    root.innerHTML = renderError(err?.message || 'Failed to load club data');
    return;
  }

  const summary = buildClubSummary(data);
  root.innerHTML = renderDashboard(ctx, summary);
  attachDashboardEvents(root, ctx, summary);
}

// ---- Renderers -----------------------------------------------------------

function renderLoading() {
  return `<section class="page-hero"><div><p class="eyebrow">Loading</p><h1>Loading the director dashboard…</h1></div></section>`;
}

function renderError(message) {
  return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">Something went wrong</p>
        <h1>Could not load the director dashboard</h1>
        <p>${esc(message)}</p>
        <div class="hero-actions">
          <a href="./app.html" class="button secondary">Back to app</a>
        </div>
      </div>
    </section>`;
}

function renderGate(ctx) {
  return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">Director access</p>
        <h1>This dashboard is part of the Club plan.</h1>
        <p>${esc(ctx.error || 'Director access is required to view this page.')}</p>
        <div class="hero-actions">
          <a href="./pricing.html" class="button primary">See Club pricing</a>
          <a href="./app.html" class="button secondary">Back to app</a>
        </div>
      </div>
      <div class="page-card">
        <p class="eyebrow">What the Club plan includes</p>
        <ul class="checklist">
          <li>Up to 10 teams (custom for more)</li>
          <li>Multi-team director dashboard</li>
          <li>Push templated practices to all teams</li>
          <li>Cross-team activity and coverage analytics</li>
          <li>Implementation and onboarding support</li>
        </ul>
      </div>
    </section>`;
}

function renderDashboard(ctx, summary) {
  return `
    ${renderHeader(ctx, summary)}
    ${renderKpis(summary.kpis)}
    ${renderTeamsTable(summary.teamRows)}
    ${renderPushTemplatePanel(summary.teamRows)}
  `;
}

function renderHeader(ctx, summary) {
  const org = summary.organization || ctx.organization;
  const sub = summary.subscription;
  return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">Club director · ${esc(org?.name || 'Your organization')}</p>
        <h1>${esc(org?.name || 'Director dashboard')}</h1>
        <p>Multi-team view of coverage, activity, and roster health across the association. Last refreshed ${esc(fmtDate(new Date().toISOString()))}.</p>
        <div class="hero-actions">
          <button class="button secondary" type="button" data-action="refresh">Refresh</button>
          <a href="./app.html" class="button ghost">Back to app</a>
        </div>
      </div>
      <div class="page-card">
        <p class="eyebrow">Subscription</p>
        <ul class="checklist">
          <li><strong>Plan:</strong> ${esc(org?.plan || 'club')}</li>
          <li><strong>Status:</strong> ${esc(org?.subscription_status || sub?.status || '—')}</li>
          <li><strong>Billing:</strong> ${esc(sub?.billing_interval || '—')}</li>
          <li><strong>Renews / ends:</strong> ${esc(fmtDate(sub?.current_period_end || sub?.cancel_at))}</li>
        </ul>
      </div>
    </section>`;
}

function renderKpis(kpis) {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="eyebrow">Last ${kpis.activityWindowDays} days</p>
        <h2>Coverage and activity</h2>
      </div>
      <div class="metric-grid">
        ${kpiCard('Total teams', kpis.totalTeams)}
        ${kpiCard('Active teams', kpis.activeTeams, kpis.totalTeams ? `${Math.round((kpis.activeTeams / kpis.totalTeams) * 100)}% active` : '')}
        ${kpiCard('Dormant teams', kpis.dormantTeams, kpis.dormantTeams > 0 ? 'Need outreach' : '')}
        ${kpiCard('Teams without head coach', kpis.teamsWithoutHeadCoach, kpis.teamsWithoutHeadCoach > 0 ? 'Assign coaches' : 'Fully staffed')}
        ${kpiCard('Active coaches', kpis.totalCoaches)}
        ${kpiCard('Practices in window', kpis.totalPractices30d)}
      </div>
    </section>`;
}

function kpiCard(label, value, subtitle = '') {
  return `
    <article class="metric-card">
      <p class="eyebrow">${esc(label)}</p>
      <strong>${esc(value)}</strong>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
    </article>`;
}

function renderTeamsTable(teamRows) {
  if (!teamRows.length) {
    return `
      <section class="section-block alt">
        <div class="page-card">
          <p class="eyebrow">No teams yet</p>
          <h2>Add your first team to get started</h2>
          <p>Once teams are added under this organization, they'll show up here with activity and coach-coverage status.</p>
          <div class="auth-actions">
            <a href="./app.html" class="button primary">Open coach app</a>
          </div>
        </div>
      </section>`;
  }
  const rowsHtml = teamRows.map(renderTeamRow).join('');
  return `
    <section class="section-block alt">
      <div class="section-heading">
        <p class="eyebrow">Teams</p>
        <h2>Per-team activity and coverage</h2>
        <p>Teams marked <em>Dormant</em> have no practices saved in the last 14 days. <em>Needs setup</em> means no head coach assigned or no practices yet.</p>
      </div>
      <div class="page-card">
        <table style="width:100%; border-collapse: collapse;" class="director-teams-table">
          <thead>
            <tr>
              <th style="text-align:left; padding: 0.5rem; border-bottom: 1px solid #444;">Team</th>
              <th style="text-align:left; padding: 0.5rem; border-bottom: 1px solid #444;">Status</th>
              <th style="text-align:left; padding: 0.5rem; border-bottom: 1px solid #444;">Coaches</th>
              <th style="text-align:left; padding: 0.5rem; border-bottom: 1px solid #444;">Last practice</th>
              <th style="text-align:right; padding: 0.5rem; border-bottom: 1px solid #444;">Practices (30d)</th>
              <th style="text-align:left; padding: 0.5rem; border-bottom: 1px solid #444;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderTeamRow(team) {
  const status = STATUS_LABELS[team.status] || STATUS_LABELS.setup;
  return `
    <tr data-team-row="${esc(team.id)}">
      <td style="padding: 0.5rem;">
        <strong>${esc(team.name)}</strong>
        ${team.ageGroup ? `<br><small>${esc(team.ageGroup)}${team.seasonLabel ? ' · ' + esc(team.seasonLabel) : ''}</small>` : ''}
      </td>
      <td style="padding: 0.5rem;">
        <span class="pill" data-tone="${esc(status.tone)}">${esc(status.label)}</span>
      </td>
      <td style="padding: 0.5rem;">
        ${esc(team.headCoaches)} head, ${esc(team.assistants)} asst
        ${team.managers ? `, ${esc(team.managers)} mgr` : ''}
      </td>
      <td style="padding: 0.5rem;">
        ${esc(fmtRelative(team.lastPractice))}
        ${team.lastPractice ? `<br><small>${esc(fmtDate(team.lastPractice))}</small>` : ''}
      </td>
      <td style="padding: 0.5rem; text-align: right;">${esc(team.practiceCount30d)}</td>
      <td style="padding: 0.5rem;">
        <label class="field" style="margin: 0;">
          <input type="checkbox" data-team-select="${esc(team.id)}" />
          <span>Include in push</span>
        </label>
      </td>
    </tr>`;
}

function renderPushTemplatePanel(teamRows) {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="eyebrow">Push template</p>
        <h2>Send a templated practice plan to selected teams</h2>
        <p>Select teams in the table above, give the practice a title, and push. Each team gets a copy in <em>Draft</em> status — head coaches can edit or publish from their own workspace.</p>
      </div>
      <div class="page-card">
        <div class="form-grid">
          <label class="field">
            <span>Practice title</span>
            <input type="text" data-push-title placeholder="e.g. Week 8 — Quick Puck Movement Theme" />
          </label>
          <label class="field">
            <span>Source plan JSON (paste exported plan, or leave blank for an empty draft)</span>
            <textarea data-push-plan rows="6" placeholder='{"theme":"Quick puck movement","totalMinutes":60,"blocks":[ ... ]}'></textarea>
          </label>
          <div class="auth-actions">
            <button class="button primary" type="button" data-push-submit>Push to selected teams</button>
            <span data-push-status class="mono"></span>
          </div>
        </div>
        <p><small>Tip: in your own coach workspace, export a plan as JSON, then paste it here to clone it across the association.</small></p>
      </div>
    </section>`;
}

// ---- Event wiring --------------------------------------------------------

function attachDashboardEvents(root, ctx, summary) {
  const refreshBtn = root.querySelector('[data-action="refresh"]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing…';
      await initClubDirectorDashboard();
    });
  }

  const pushBtn = root.querySelector('[data-push-submit]');
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      await handlePushTemplate(root, ctx, summary);
    });
  }
}

async function handlePushTemplate(root, ctx, summary) {
  const status = root.querySelector('[data-push-status]');
  const titleInput = root.querySelector('[data-push-title]');
  const planInput = root.querySelector('[data-push-plan]');
  const checked = Array.from(root.querySelectorAll('[data-team-select]:checked'));
  const teamIds = checked.map(el => el.getAttribute('data-team-select')).filter(Boolean);

  if (!teamIds.length) {
    status.textContent = 'Select at least one team first.';
    return;
  }
  const title = (titleInput?.value || '').trim();
  if (!title) {
    status.textContent = 'Add a practice title.';
    return;
  }
  let planData = {};
  const planRaw = (planInput?.value || '').trim();
  if (planRaw) {
    try {
      planData = JSON.parse(planRaw);
    } catch {
      status.textContent = 'Plan JSON is not valid. Paste an exported practice plan or leave blank.';
      return;
    }
  }

  status.textContent = 'Pushing…';
  try {
    const result = await pushPracticeTemplate(ctx.supabase, {
      orgId: ctx.organization.id,
      teamIds,
      title,
      planData,
      createdBy: ctx.user?.id || null,
    });
    if (result.successCount === teamIds.length) {
      status.textContent = `Pushed to ${result.successCount} team${result.successCount === 1 ? '' : 's'}.`;
      toast(`Pushed "${title}" to ${result.successCount} teams`);
      titleInput.value = '';
      planInput.value = '';
      checked.forEach(el => { el.checked = false; });
    } else {
      status.textContent = `Pushed to ${result.successCount} of ${teamIds.length}. See console for failures.`;
      console.warn('Push failures', result.failures);
    }
  } catch (err) {
    status.textContent = `Push failed: ${err?.message || 'unknown error'}`;
    console.error('Push template error', err);
  }
}
