const SCORE_VERSION = '0.3.4';

const CATEGORY_LABELS = {
  warmup: 'Warmup', skating: 'Skating', puck: 'Puck Handling', passing: 'Passing', shooting: 'Shooting', battle: 'Compete', compete: 'Compete', breakout: 'Breakouts', dzone: 'D-Zone', ozone: 'Forecheck', forecheck: 'Forecheck', transition: 'Transition', pp: 'Power Play', pk: 'Penalty Kill', sag: 'Small Area', cond: 'Conditioning', goalie: 'Goalie', mixed: 'Mixed Skills'
};

function clamp(value, min = 1, max = 10) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function words(value) {
  if (Array.isArray(value)) return value.map(words).join(' ');
  return String(value || '').toLowerCase();
}

function tokenizeDrill(drill = {}) {
  return words([
    drill.name, drill.category, drill.description, drill.instructions, drill.points,
    drill.coaching_points, drill.coachingPoints, drill.tags, drill.skillFocus,
    drill.ice_type, drill.iceUsage, drill.difficulty, drill.intensity
  ]);
}

function ageNumber(ageGroup) {
  const match = String(ageGroup || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function drillAgeGroups(drill = {}) {
  const raw = [drill.ageGroup, drill.ageGroups, drill.ageLevels, drill.levels].flat().filter(Boolean);
  return raw.map((value) => String(value).trim()).filter(Boolean);
}

function calcAgeFit(drill = {}, ageGroup = '') {
  const groups = drillAgeGroups(drill);
  if (!ageGroup || !groups.length) return 7;
  const requested = String(ageGroup).toLowerCase();
  if (groups.some((group) => group.toLowerCase() === requested)) return 10;

  const wanted = ageNumber(ageGroup);
  const ages = groups.map(ageNumber).filter((n) => Number.isFinite(n));
  if (wanted && ages.length) {
    const closest = Math.min(...ages.map((age) => Math.abs(age - wanted)));
    if (closest <= 2) return 8;
    if (closest <= 4) return 6;
    return 4;
  }
  return 6;
}

function calcDifficulty(drill = {}) {
  const raw = words([drill.difficulty, drill.level, drill.intensity, drill.tags]);
  if (/elite|advanced|hard|high/.test(raw)) return 8;
  if (/intermediate|medium|moderate|travel/.test(raw)) return 6;
  if (/beginner|basic|intro|low|learn/.test(raw)) return 3;
  if (/battle|compete|pressure|under fire|2v2|3v3/.test(tokenizeDrill(drill))) return 7;
  return 5;
}

function calcFun(drill = {}) {
  const text = tokenizeDrill(drill);
  let score = 5;
  if (/compete|battle|game|small area|sag|race|relay|challenge|score|2v2|3v3/.test(text)) score += 3;
  if (/shoot|shot|goal|breakaway|attack/.test(text)) score += 1;
  if (/warmup|flow/.test(text)) score += 0.5;
  if (/station|line|technical/.test(text)) score -= 1;
  return clamp(Math.round(score), 1, 10);
}

function calcSetupComplexity(drill = {}) {
  const text = tokenizeDrill(drill);
  const ice = words([drill.ice_type, drill.iceUsage]);
  let score = 7;
  if (/quarter|station|small area|sag/.test(ice + ' ' + text)) score += 1;
  if (/full|5-man|team play|special teams|power play|penalty kill/.test(ice + ' ' + text)) score -= 2;
  if (/multiple|rotation|progression|sequence/.test(text)) score -= 1;
  if (/free movement|simple|basic|warm-up|warmup/.test(text)) score += 1;
  return clamp(Math.round(score), 1, 10);
}

function calcGoalieUse(drill = {}) {
  const text = tokenizeDrill(drill);
  if (drill.goalies === true || drill.includeGoalie === true || /goalie|shot|shoot|breakaway|net|finish|rebound/.test(text)) return 9;
  if (/passing|puck control|edges|warmup|breakout/.test(text)) return 4;
  return 3;
}

function calcEfficiency(drill = {}) {
  const text = tokenizeDrill(drill);
  const duration = Number(drill.duration || drill.minutes || 8);
  let score = 6;
  if (/flow|continuous|station|small area|keep-away|keepaway|all players|pairs/.test(text)) score += 2;
  if (/line|one at a time|waiting/.test(text)) score -= 2;
  if (duration <= 6) score += 1;
  if (duration >= 14) score -= 1;
  return clamp(Math.round(score), 1, 10);
}

function calcAnimationValue(drill = {}) {
  if (drill.diagram && Array.isArray(drill.diagram.objects) && drill.diagram.objects.length) return 10;
  if (drill.diagram || drill.animated) return 8;
  return 3;
}

function calcOverall(drill = {}, context = {}) {
  const scores = {
    ageFit: calcAgeFit(drill, context.ageGroup),
    fun: calcFun(drill),
    setup: calcSetupComplexity(drill),
    efficiency: calcEfficiency(drill),
    goalieUse: calcGoalieUse(drill),
    animation: calcAnimationValue(drill),
  };
  const includeGoalie = context.includeGoalie === true || /goalie|goalies/.test(words(context.focus || context.notes || ''));
  const goalieWeight = includeGoalie ? 0.12 : 0.05;
  const score =
    scores.ageFit * 0.23 +
    scores.fun * 0.20 +
    scores.setup * 0.16 +
    scores.efficiency * 0.22 +
    scores.animation * 0.14 +
    scores.goalieUse * goalieWeight;
  return clamp(Math.round(score), 1, 10);
}

export function scoreDrill(drill = {}, context = {}) {
  const score = {
    version: SCORE_VERSION,
    overall: calcOverall(drill, context),
    ageFit: calcAgeFit(drill, context.ageGroup),
    difficulty: calcDifficulty(drill),
    fun: calcFun(drill),
    setup: calcSetupComplexity(drill),
    goalieUse: calcGoalieUse(drill),
    efficiency: calcEfficiency(drill),
    animation: calcAnimationValue(drill),
  };
  score.label = score.overall >= 9 ? 'Elite fit' : score.overall >= 8 ? 'Strong fit' : score.overall >= 6 ? 'Good fit' : 'Use selectively';
  score.reason = explainScore(score, drill);
  return score;
}

export function explainScore(score, drill = {}) {
  if (score.animation >= 9 && score.efficiency >= 8) return 'Animated and high-rep; easy to teach quickly.';
  if (score.fun >= 8) return 'High-engagement drill that should keep players competing.';
  if (score.setup >= 8) return 'Quick setup; strong choice when ice time is tight.';
  if (score.goalieUse >= 8) return 'Good goalie involvement and finishing reps.';
  if (score.ageFit <= 5) return 'Check the age fit before using this with your group.';
  if (score.difficulty >= 8) return 'Demanding drill; run after a clear demo or walkthrough.';
  return `${CATEGORY_LABELS[drill.category] || 'Drill'} with balanced teaching value.`;
}

export function scorePractice(plan = {}, drills = [], context = {}) {
  const byId = new Map(drills.map((drill) => [drill.id, drill]));
  const blockScores = (plan.blocks || []).map((block) => {
    const drill = byId.get(block.drillId) || block.drill || {};
    return { blockId: block.id, drillId: block.drillId, score: scoreDrill(drill, context) };
  });
  const overall = blockScores.length ? Math.round(blockScores.reduce((sum, item) => sum + item.score.overall, 0) / blockScores.length) : 0;
  return { overall, blockScores };
}

export function recommendDrillsByScore(drills = [], context = {}, limit = 6) {
  const recentIds = new Set(context.recentDrillIds || []);
  const focus = words(context.focus || context.theme || '');
  return drills
    .map((drill) => {
      const score = scoreDrill(drill, context);
      const text = tokenizeDrill(drill);
      let rank = score.overall;
      if (focus && text.includes(focus)) rank += 1.5;
      if (recentIds.has(drill.id)) rank -= 2;
      if (context.preferAnimated !== false && (drill.diagram || drill.animated)) rank += 0.75;
      return { drill, score, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

export function renderScoreBadge(score) {
  if (!score) return '';
  return `<span class="drill-score-badge" title="${escapeHtml(score.reason || '')}">★ ${score.overall}/10 · ${escapeHtml(score.label || 'Score')}</span>`;
}

export function renderScorePanel(score) {
  if (!score) return '';
  return `
    <div class="drill-score-panel">
      <div class="drill-score-top"><strong>★ ${score.overall}/10</strong><span>${escapeHtml(score.label)}</span></div>
      <div class="drill-score-reason">${escapeHtml(score.reason)}</div>
      <div class="drill-score-grid">
        <span>Age ${score.ageFit}</span><span>Fun ${score.fun}</span><span>Reps ${score.efficiency}</span><span>Setup ${score.setup}</span><span>Goalie ${score.goalieUse}</span><span>Animation ${score.animation}</span>
      </div>
    </div>`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  scoreDrill,
  scorePractice,
  explainScore,
  recommendDrillsByScore,
  renderScoreBadge,
  renderScorePanel,
};
