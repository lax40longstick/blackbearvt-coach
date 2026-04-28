const FOCUS_LABELS = {
  skating: 'Skating', puck: 'Puck Handling', passing: 'Passing', shooting: 'Shooting', battle: 'Compete', breakout: 'Breakouts', dzone: 'D-Zone', ozone: 'Forecheck', pp: 'Power Play', pk: 'Penalty Kill', sag: 'Small Area', cond: 'Conditioning', goalie: 'Goalie', mixed: 'Mixed Skills'
};

function safeText(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function minutesInPlan(plan) {
  return (plan?.blocks || []).reduce((sum, block) => sum + (Number(block.minutes) || Number(block.duration) || 0), 0);
}

function planDrillIds(plan) {
  return new Set((plan?.blocks || []).map((block) => block.drillId).filter(Boolean));
}

function getRecentPlans(state) {
  return [...(state.plans || [])]
    .sort((a, b) => String(b.savedAt || b.date || '').localeCompare(String(a.savedAt || a.date || '')))
    .slice(0, 3);
}

function getCurrentPlanLabel(state) {
  const current = state.currentPlan || {};
  if ((current.blocks || []).length) return current.title || 'Current practice plan';
  const recent = getRecentPlans(state)[0];
  return recent?.title || 'Build tonight\'s practice';
}

function skillUsage(state) {
  const usage = {};
  const plans = [...(state.plans || []), state.currentPlan].filter(Boolean);
  plans.forEach((plan) => {
    (plan.blocks || []).forEach((block) => {
      const drill = (state.drills || []).find((d) => d.id === block.drillId) || {};
      const keys = [drill.category, ...(drill.skillFocus || []), block.focus].filter(Boolean);
      keys.forEach((key) => {
        const normalized = String(key).toLowerCase().replace('puck handling', 'puck').replace('compete', 'battle');
        usage[normalized] = (usage[normalized] || 0) + 1;
      });
    });
  });
  return usage;
}

function suggestedFocus(state) {
  if (window.BearDenHQ?.getNextPracticeFocus) {
    const next = window.BearDenHQ.getNextPracticeFocus(state);
    if (next?.skill) return { key: next.skill, count: next.minutes || 0 };
  }
  const core = ['skating', 'passing', 'shooting', 'battle', 'breakout', 'dzone', 'ozone', 'goalie'];
  const usage = skillUsage(state);
  return core.map((key) => ({ key, count: usage[key] || 0 })).sort((a, b) => a.count - b.count)[0] || { key: 'mixed', count: 0 };
}

function favoriteDrills(state) {
  return (state.drills || [])
    .filter((drill) => drill.favorite || drill.isFavorite)
    .slice(0, 4);
}

function recommendedDrills(state) {
  const focus = suggestedFocus(state).key;
  const recentIds = new Set(getRecentPlans(state).flatMap((plan) => [...planDrillIds(plan)]));
  if (window.BearDenHQ?.recommendDrillsByScore) {
    return window.BearDenHQ.recommendDrillsByScore(state.drills || [], {
      ageGroup: '10U',
      includeGoalie: true,
      focus,
      theme: focus,
      preferAnimated: true,
      recentDrillIds: [...recentIds],
    }, 4).map((entry) => entry.drill);
  }
  return (state.drills || [])
    .map((drill) => {
      const text = `${drill.category || ''} ${(drill.skillFocus || []).join(' ')} ${drill.name || ''}`.toLowerCase();
      let score = 0;
      if (text.includes(focus)) score += 6;
      if (drill.diagram || drill.animated) score += 3;
      if (drill.favorite || drill.isFavorite) score += 2;
      if (recentIds.has(drill.id)) score -= 4;
      score += Math.min(Number(drill.usage || 0), 4) * 0.2;
      return { drill, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.drill);
}

function dashboardMetrics(state) {
  const animated = (state.drills || []).filter((drill) => drill.diagram || drill.animated).length;
  const planCount = (state.plans || []).length;
  const currentBlocks = (state.currentPlan?.blocks || []).length;
  const focus = suggestedFocus(state);
  return { animated, planCount, currentBlocks, focus };
}

function drillCard(drill, action = 'preview') {
  if (!drill) return '';
  const category = FOCUS_LABELS[drill.category] || drill.category || 'Drill';
  const duration = Number(drill.duration) || Number(drill.minutes) || 8;
  const animated = drill.diagram || drill.animated;
  const favorite = drill.favorite || drill.isFavorite;
  return `
    <div class="coach-drill-card">
      <button class="coach-fav ${favorite ? 'active' : ''}" title="Favorite drill" onclick="toggleDashboardFavorite('${drill.id}')">★</button>
      <div class="coach-drill-main" onclick="${action === 'open' ? `openDashboardDrill('${drill.id}')` : `previewDashboardDrill('${drill.id}')`}">
        <div class="coach-drill-name">${safeText(drill.name || 'Untitled drill')}</div>
        <div class="coach-drill-meta">${safeText(category)} · ${duration} min${animated ? ' · Animated' : ''}</div>
        ${window.BearDenHQ?.renderScoreBadge ? `<div style="margin-top: 6px">${window.BearDenHQ.renderScoreBadge(window.BearDenHQ.scoreDrill(drill, { ageGroup: '10U', includeGoalie: true }))}</div>` : ''}
      </div>
    </div>`;
}

function recentPlanCard(plan) {
  const title = plan?.title || 'Saved practice';
  const minutes = minutesInPlan(plan) || plan?.totalMinutes || 0;
  const blocks = (plan?.blocks || []).length;
  return `
    <div class="coach-plan-row" onclick="loadDashboardPlan('${plan.id}')">
      <div>
        <div class="coach-plan-title">${safeText(title)}</div>
        <div class="coach-plan-meta">${safeText(plan.date || '')} · ${minutes} min · ${blocks} blocks</div>
      </div>
      <span>Open →</span>
    </div>`;
}

function renderCoachDashboardHtml(state) {
  const metrics = dashboardMetrics(state);
  const recent = getRecentPlans(state);
  const favorites = favoriteDrills(state);
  const recs = recommendedDrills(state);
  const focusName = FOCUS_LABELS[metrics.focus.key] || metrics.focus.key;
  const currentLabel = getCurrentPlanLabel(state);
  const currentMinutes = minutesInPlan(state.currentPlan) || state.currentPlan?.totalMinutes || 60;

  return `
    <div class="coach-dashboard-shell">
      <div class="coach-hero">
        <div>
          <div class="coach-kicker">Coach Dashboard</div>
          <h2>${safeText(currentLabel)}</h2>
          <p>One-tap practice planning, recommended animated drills, and quick access to the tools coaches use before stepping on the ice.</p>
        </div>
        <div class="coach-hero-actions">
          <button class="btn primary" onclick="dashboardBuildTonight()">Build Tonight</button>
          <button class="btn" onclick="dashboardAIBuilder()">AI Builder</button>
          <button class="btn" onclick="openMarketplace()">Marketplace</button>
          <button class="btn" onclick="dashboardContinuePlan()">Continue Plan</button>
        </div>
      </div>

      <div class="coach-metrics">
        <div class="coach-metric"><span>${metrics.planCount}</span><label>Saved Plans</label></div>
        <div class="coach-metric"><span>${metrics.animated}</span><label>Animated Drills</label></div>
        <div class="coach-metric"><span>${metrics.currentBlocks}</span><label>Current Blocks</label></div>
        <div class="coach-metric"><span>${safeText(focusName)}</span><label>Suggested Focus</label></div>
      </div>

      ${window.BearDenHQ && window.BearDenHQ.renderTeamDevelopmentHtml ? window.BearDenHQ.renderTeamDevelopmentHtml(state) : ""}

      <div class="coach-grid-2">
        <div class="panel coach-panel">
          <div class="panel-title"><span>Recommended for Next Practice</span><span class="count">${safeText(focusName)}</span></div>
          <div class="coach-card-list">${recs.length ? recs.map((drill) => drillCard(drill)).join('') : '<div class="empty-state">Add drills to get recommendations.</div>'}</div>
          <button class="btn full" onclick="dashboardBuildFocus('${metrics.focus.key}')">Build ${safeText(focusName)} Practice</button>
        </div>

        <div class="panel coach-panel">
          <div class="panel-title"><span>Practice Shortcuts</span></div>
          <div class="coach-shortcuts">
            <button onclick="dashboardBuildFocus('skating')">Skating</button>
            <button onclick="dashboardBuildFocus('passing')">Passing</button>
            <button onclick="dashboardBuildFocus('shooting')">Shooting</button>
            <button onclick="dashboardBuildFocus('battle')">Compete</button>
            <button onclick="dashboardBuildFocus('breakout')">Breakouts</button>
            <button onclick="dashboardBuildFocus('goalie')">Goalie</button>
          </div>
          <div class="coach-current-plan">
            <div class="coach-kicker">Current Plan</div>
            <strong>${safeText(state.currentPlan?.title || 'No active plan')}</strong>
            <span>${currentMinutes} min · ${(state.currentPlan?.blocks || []).length} blocks</span>
          </div>
        </div>
      </div>

      <div class="coach-grid-2">
        <div class="panel coach-panel">
          <div class="panel-title"><span>Recent Plans</span></div>
          <div class="coach-card-list">${recent.length ? recent.map(recentPlanCard).join('') : '<div class="empty-state">No saved plans yet. Build one from Practice.</div>'}</div>
        </div>
        <div class="panel coach-panel">
          <div class="panel-title"><span>Favorite Drills</span></div>
          <div class="coach-card-list">${favorites.length ? favorites.map((drill) => drillCard(drill, 'open')).join('') : '<div class="empty-state">Tap ★ on drills to create your go-to list.</div>'}</div>
        </div>
      </div>
    </div>`;
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  renderCoachDashboardHtml,
  getCoachDashboardData: (state) => ({ recentPlans: getRecentPlans(state), favorites: favoriteDrills(state), recommended: recommendedDrills(state), suggestedFocus: suggestedFocus(state) }),
};
