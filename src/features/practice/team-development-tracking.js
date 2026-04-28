const TRACKING_VERSION = '0.3.6';

const SKILL_LABELS = {
  skating: 'Skating', puck: 'Puck Handling', passing: 'Passing', shooting: 'Shooting', battle: 'Compete', compete: 'Compete', breakout: 'Breakouts', dzone: 'D-Zone', ozone: 'Forecheck', forecheck: 'Forecheck', transition: 'Transition', sag: 'Small Area', goalie: 'Goalie', cond: 'Conditioning', pp: 'Power Play', pk: 'Penalty Kill', mixed: 'Mixed Skills'
};

const CORE_SKILLS = ['skating', 'puck', 'passing', 'shooting', 'battle', 'breakout', 'dzone', 'ozone', 'goalie'];

function cleanSkill(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return '';
  if (raw.includes('puck')) return 'puck';
  if (raw.includes('compete') || raw.includes('battle')) return 'battle';
  if (raw.includes('small')) return 'sag';
  if (raw.includes('forecheck')) return 'ozone';
  if (raw.includes('defen') || raw.includes('d-zone') || raw.includes('dzone')) return 'dzone';
  if (raw.includes('breakout')) return 'breakout';
  if (raw.includes('goalie')) return 'goalie';
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getPlanMinutes(plan = {}) {
  return (plan.blocks || []).reduce((sum, block) => sum + (Number(block.minutes) || Number(block.duration) || 0), 0) || Number(plan.totalMinutes) || 0;
}

function getDrillSkills(drill = {}, block = {}) {
  const skills = [drill.category, block.focus, ...(drill.skillFocus || []), ...(drill.tags || [])]
    .map(cleanSkill)
    .filter(Boolean)
    .filter((skill) => SKILL_LABELS[skill] || CORE_SKILLS.includes(skill));
  return [...new Set(skills.length ? skills : ['mixed'])];
}

function findDrill(state = {}, drillId) {
  return (state.drills || []).find((drill) => drill.id === drillId) || null;
}

function ensureDevelopmentState(state = {}) {
  if (!state.development || typeof state.development !== 'object') state.development = {};
  if (!Array.isArray(state.development.completedPractices)) state.development.completedPractices = [];
  if (!state.development.skillGoals || typeof state.development.skillGoals !== 'object') state.development.skillGoals = {};
  state.development.trackingVersion = TRACKING_VERSION;
  return state.development;
}

function summarizePlan(plan = {}, state = {}) {
  const skillMinutes = {};
  const drillIds = [];
  const drillNames = [];
  (plan.blocks || []).forEach((block) => {
    const drill = findDrill(state, block.drillId) || block.drill || {};
    const minutes = Number(block.minutes) || Number(drill.duration) || 0;
    if (block.drillId) drillIds.push(block.drillId);
    if (drill.name || block.drillName) drillNames.push(drill.name || block.drillName);
    getDrillSkills(drill, block).forEach((skill) => {
      skillMinutes[skill] = (skillMinutes[skill] || 0) + minutes;
    });
  });
  return { skillMinutes, drillIds, drillNames };
}

export function completePracticePlan(plan = {}, state = {}, options = {}) {
  if (!plan?.blocks?.length) throw new Error('Build a practice before marking it complete.');
  const development = ensureDevelopmentState(state);
  const summary = summarizePlan(plan, state);
  const completedAt = options.completedAt || new Date().toISOString();
  const id = options.id || `${plan.id || 'practice'}-${completedAt}`;
  const record = {
    id,
    planId: plan.id || null,
    title: plan.title || 'Completed practice',
    date: plan.date || completedAt.slice(0, 10),
    completedAt,
    theme: plan.theme || '',
    progression: plan.progression || '',
    totalMinutes: getPlanMinutes(plan),
    blockCount: (plan.blocks || []).length,
    drillIds: summary.drillIds,
    drillNames: summary.drillNames.slice(0, 12),
    skillMinutes: summary.skillMinutes,
    notes: options.notes || '',
  };

  development.completedPractices = development.completedPractices.filter((entry) => entry.id !== id);
  development.completedPractices.push(record);
  development.completedPractices.sort((a, b) => String(b.completedAt || b.date || '').localeCompare(String(a.completedAt || a.date || '')));
  development.lastCompletedAt = completedAt;
  development.lastSummary = record;

  (plan.blocks || []).forEach((block) => {
    const drill = findDrill(state, block.drillId);
    if (drill) {
      drill.usage = (Number(drill.usage) || 0) + 1;
      drill.lastUsedAt = completedAt;
    }
  });

  return state;
}

function collectSkillMinutesFromPlans(plans = [], state = {}) {
  const totals = {};
  plans.forEach((plan) => {
    const summary = summarizePlan(plan, state);
    Object.entries(summary.skillMinutes).forEach(([skill, minutes]) => {
      totals[skill] = (totals[skill] || 0) + minutes;
    });
  });
  return totals;
}

export function analyzeTeamDevelopment(state = {}) {
  const development = ensureDevelopmentState(state);
  const completed = development.completedPractices || [];
  const totals = {};
  completed.forEach((practice) => {
    Object.entries(practice.skillMinutes || {}).forEach(([skill, minutes]) => {
      totals[skill] = (totals[skill] || 0) + Number(minutes || 0);
    });
  });

  if (!completed.length) {
    Object.assign(totals, collectSkillMinutesFromPlans([...(state.plans || []), state.currentPlan].filter(Boolean), state));
  }

  const totalMinutes = Object.values(totals).reduce((sum, minutes) => sum + Number(minutes || 0), 0);
  const skillRows = CORE_SKILLS.map((skill) => {
    const minutes = Math.round(totals[skill] || 0);
    const pct = totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0;
    return { skill, label: SKILL_LABELS[skill] || skill, minutes, pct };
  });
  const sortedByNeed = [...skillRows].sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label));
  const sortedByVolume = [...skillRows].sort((a, b) => b.minutes - a.minutes);
  const nextFocus = sortedByNeed.find((row) => row.skill !== 'goalie' || totalMinutes === 0 || row.minutes < Math.max(12, totalMinutes * 0.08)) || sortedByNeed[0];
  const strengths = sortedByVolume.filter((row) => row.minutes > 0).slice(0, 3);
  const gaps = sortedByNeed.slice(0, 3);
  const completedCount = completed.length;
  const lastPractice = completed[0] || null;
  const lastThree = completed.slice(0, 3);

  return {
    version: TRACKING_VERSION,
    completedCount,
    totalMinutes: Math.round(totalMinutes),
    skillRows,
    strengths,
    gaps,
    nextFocus: nextFocus || { skill: 'mixed', label: 'Mixed Skills', minutes: 0, pct: 0 },
    lastPractice,
    lastThree,
    recommendation: buildRecommendation(nextFocus, gaps, completedCount),
  };
}

function buildRecommendation(nextFocus, gaps, completedCount) {
  if (!completedCount) return 'Complete one practice to unlock stronger recommendations. For now, use the lowest-covered skill as the next focus.';
  const gapText = gaps.map((gap) => gap.label).join(', ');
  return `Next practice should emphasize ${nextFocus?.label || 'Mixed Skills'} because recent logged work is lightest in ${gapText}.`;
}

export function getNextPracticeFocus(state = {}) {
  return analyzeTeamDevelopment(state).nextFocus;
}

export function recommendDevelopmentDrills(state = {}, limit = 5) {
  const analysis = analyzeTeamDevelopment(state);
  const recentIds = new Set((analysis.lastThree || []).flatMap((practice) => practice.drillIds || []));
  const context = {
    ageGroup: document.getElementById('genAgeGroup')?.value || '10U',
    includeGoalie: true,
    focus: analysis.nextFocus.skill,
    theme: analysis.nextFocus.skill,
    preferAnimated: true,
    recentDrillIds: [...recentIds],
  };
  if (window.BearDenHQ?.recommendDrillsByScore) {
    return window.BearDenHQ.recommendDrillsByScore(state.drills || [], context, limit);
  }
  return (state.drills || [])
    .filter((drill) => getDrillSkills(drill).includes(analysis.nextFocus.skill))
    .slice(0, limit)
    .map((drill) => ({ drill, score: null, rank: 0 }));
}

export function renderTeamDevelopmentHtml(state = {}) {
  const analysis = analyzeTeamDevelopment(state);
  const maxMinutes = Math.max(1, ...analysis.skillRows.map((row) => row.minutes));
  return `
    <div class="development-card">
      <div class="development-head">
        <div>
          <div class="coach-kicker">Team Development</div>
          <h3>${escapeHtml(analysis.nextFocus.label)} should be next</h3>
          <p>${escapeHtml(analysis.recommendation)}</p>
        </div>
        <div class="development-score"><strong>${analysis.completedCount}</strong><span>completed</span></div>
      </div>
      <div class="development-bars">
        ${analysis.skillRows.map((row) => `
          <div class="development-row">
            <div class="development-label"><span>${escapeHtml(row.label)}</span><em>${row.minutes} min</em></div>
            <div class="development-track"><i style="width:${Math.max(4, Math.round((row.minutes / maxMinutes) * 100))}%"></i></div>
          </div>`).join('')}
      </div>
      <div class="development-actions">
        <button class="btn small primary" onclick="dashboardBuildFocus('${escapeHtml(analysis.nextFocus.skill)}')">Build ${escapeHtml(analysis.nextFocus.label)} Practice</button>
        <button class="btn small" onclick="navTo('practice')">Open Practice Builder</button>
      </div>
    </div>`;
}

export function renderDevelopmentRecommendationsHtml(state = {}) {
  const items = recommendDevelopmentDrills(state, 4);
  if (!items.length) return '<div class="empty-state">Complete practices to improve recommendations.</div>';
  return items.map(({ drill, score }) => `
    <div class="coach-drill-card">
      <div class="coach-drill-main" onclick="previewDashboardDrill('${drill.id}')">
        <div class="coach-drill-name">${escapeHtml(drill.name || 'Untitled drill')}</div>
        <div class="coach-drill-meta">${escapeHtml(SKILL_LABELS[drill.category] || drill.category || 'Drill')} · ${Number(drill.duration) || 8} min${drill.diagram || drill.animated ? ' · Animated' : ''}</div>
        ${score && window.BearDenHQ?.renderScoreBadge ? `<div style="margin-top: 6px">${window.BearDenHQ.renderScoreBadge(score)}</div>` : ''}
      </div>
    </div>`).join('');
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  TRACKING_VERSION,
  ensureDevelopmentState,
  completePracticePlan,
  analyzeTeamDevelopment,
  getNextPracticeFocus,
  recommendDevelopmentDrills,
  renderTeamDevelopmentHtml,
  renderDevelopmentRecommendationsHtml,
};
