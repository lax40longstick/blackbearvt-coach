import { drawDiagram, playDiagram } from '../../../components/diagram.js';
import { drills as animatedDrills } from '../../../data/drills.js';

const CATEGORY_MAP = {
  compete: 'battle',
  forecheck: 'ozone',
  transition: 'passing',
  defense: 'dzone',
  smallarea: 'sag',
};

const THEME_WEIGHTS = {
  mixed: { skating: 2, puck: 2, passing: 2, shooting: 2, battle: 1, breakout: 1, sag: 1, goalie: 0.5 },
  skating: { skating: 5, puck: 1, passing: 1, cond: 1 },
  passing: { passing: 5, puck: 1, breakout: 2, shooting: 1 },
  breakout: { breakout: 5, passing: 2, dzone: 1, skating: 1 },
  forecheck: { ozone: 3, battle: 3, sag: 2, skating: 1 },
  compete: { battle: 4, sag: 3, shooting: 1, cond: 1 },
};

const PROGRESSION_LABELS = {
  balanced: ['Warm-up', 'Skill Build', 'Team Concept', 'Pressure Rep', 'Game Transfer'],
  teach: ['Warm-up', 'Teach', 'Guided Reps', 'Correction Rep', 'Confidence Finish'],
  pressure: ['Warm-up', 'Skill Under Load', 'Read Pressure', 'Battle Transfer', 'Compete Finish'],
  transfer: ['Warm-up', 'Technical Rep', 'Pattern Rep', 'Game-Like Rep', 'Scrimmage Transfer'],
  compete: ['Warm-up', 'Battle Prep', 'Compete Rep', 'Small-Area Game', 'Winner Finish'],
};

function normalizeCategory(category) {
  return CATEGORY_MAP[category] || category || 'skating';
}

function compactPoints(points) {
  if (Array.isArray(points)) return points;
  return String(points || '').split('\n').map((p) => p.trim()).filter(Boolean);
}

function enrichDrill(drill, index = 0) {
  const category = normalizeCategory(drill.category);
  const coachingPoints = compactPoints(drill.coaching_points || drill.points);
  return {
    ...drill,
    id: drill.id || crypto.randomUUID(),
    category,
    duration: drill.duration || durationByCategory(category),
    description: drill.description || drill.instructions || 'Run the drill with clear setup, crisp reps, and short coaching stoppages.',
    points: drill.points || coachingPoints.join('\n'),
    coaching_points: coachingPoints,
    ageLevels: drill.ageLevels || inferAgeLevels(drill, index),
    skillFocus: drill.skillFocus || inferSkillFocus(drill),
    iceUsage: drill.iceUsage || drill.ice_type || inferIceUsage(drill),
    difficulty: drill.difficulty || inferDifficulty(drill),
    playerCount: drill.playerCount || inferPlayerCount(drill.diagram),
    progression: drill.progression || buildProgression(drill),
    commonMistakes: drill.commonMistakes || buildCommonMistakes(category),
    equipment: drill.equipment || inferEquipment(drill),
    animated: Boolean(drill.diagram),
  };
}

function durationByCategory(category) {
  return ({ skating: 6, puck: 6, passing: 8, shooting: 7, battle: 8, breakout: 10, dzone: 10, ozone: 9, pp: 10, pk: 10, sag: 9, cond: 6, goalie: 8 })[category] || 8;
}

function inferAgeLevels(drill, index) {
  if (/elite|system|power play|penalty kill/i.test(drill.name || '')) return ['12U', '14U', 'HS'];
  if ((drill.intensity || '') === 'high' || index % 4 === 0) return ['10U', '12U', '14U'];
  return ['8U', '10U', '12U'];
}

function inferSkillFocus(drill) {
  const text = `${drill.name || ''} ${drill.description || ''} ${(drill.tags || []).join(' ')}`.toLowerCase();
  const focuses = [];
  ['skating', 'passing', 'shooting', 'breakout', 'forecheck', 'compete', 'puck', 'transition'].forEach((key) => {
    if (text.includes(key)) focuses.push(key === 'puck' ? 'puck handling' : key);
  });
  return focuses.length ? focuses : [normalizeCategory(drill.category)];
}

function inferIceUsage(drill) {
  const rink = drill.diagram?.rink || '';
  if (rink.includes('quarter') || drill.ice_type === 'quarter') return 'quarter ice';
  if (drill.ice_type === 'full') return 'full ice';
  return 'half ice';
}

function inferDifficulty(drill) {
  if ((drill.intensity || '') === 'high') return 'advanced';
  if (/progression|warm|basic|station/i.test(drill.name || '')) return 'beginner';
  return 'intermediate';
}

function inferPlayerCount(diagram) {
  const count = (diagram?.objects || []).filter((o) => !['puck', 'cone', 'goal'].includes(o.type)).length;
  if (!count) return '4+';
  return count <= 3 ? `${count}+` : `${count}-${Math.max(count + 4, 8)}`;
}

function buildProgression(drill) {
  const category = normalizeCategory(drill.category);
  if (category === 'passing') return ['Static reps', 'Add movement', 'Add pressure', 'Finish with shot'];
  if (category === 'breakout') return ['Walk through routes', 'Add forechecker', 'Add second option', 'Score off the exit'];
  if (category === 'battle') return ['Body position only', 'Live puck', 'Add support player', 'Winner attacks net'];
  if (category === 'skating') return ['Slow mechanics', 'Race pace', 'Puck added', 'Relay/competition'];
  return ['Teach pattern', 'Run clean reps', 'Add decision', 'Compete/game transfer'];
}

function buildCommonMistakes(category) {
  return ({
    skating: ['Standing tall through turns', 'Gliding into stops'],
    puck: ['Eyes locked on puck', 'Hands too close to body'],
    passing: ['Passing to feet', 'Standing still after pass'],
    shooting: ['Slow release', 'No net-front follow-up'],
    breakout: ['No shoulder check', 'Wingers leave too early'],
    battle: ['Reaching instead of skating through body', 'No second effort'],
    goalie: ['Late set feet', 'Poor rebound tracking'],
  })[category] || ['Players drift out of spacing', 'Coach allows low-tempo reps'];
}

function inferEquipment(drill) {
  const text = `${drill.name || ''} ${drill.description || ''}`.toLowerCase();
  const items = ['pucks'];
  if (text.includes('cone') || text.includes('gate')) items.push('cones');
  if (text.includes('target')) items.push('net targets');
  return items;
}

function getAnimatedLibrary() {
  return animatedDrills.map((drill, index) => enrichDrill({ ...drill, source: 'animated-library' }, index));
}

function seedAnimatedMatches(drills) {
  const library = getAnimatedLibrary();
  const byCategory = new Map();
  library.forEach((drill) => {
    const list = byCategory.get(drill.category) || [];
    list.push(drill);
    byCategory.set(drill.category, list);
  });
  return drills.map((drill, index) => {
    const enriched = enrichDrill(drill, index);
    if (enriched.diagram) return enriched;
    const pool = byCategory.get(enriched.category) || library;
    const match = pool[index % pool.length];
    return {
      ...enriched,
      diagram: match?.diagram || enriched.diagram,
      animated: Boolean(match?.diagram),
      progression: enriched.progression || match?.progression,
    };
  });
}

function migrateState(state) {
  const next = { ...state };
  const existing = Array.isArray(next.drills) ? next.drills : [];
  const enriched = seedAnimatedMatches(existing);
  const existingNames = new Set(enriched.map((d) => String(d.name || '').toLowerCase()));
  const premiumAdds = getAnimatedLibrary()
    .filter((d) => !existingNames.has(String(d.name || '').toLowerCase()))
    .slice(0, 18)
    .map((d) => ({ ...d, id: d.id || crypto.randomUUID(), isCustom: false, usage: d.usage || 0 }));
  next.drills = [...enriched, ...premiumAdds];
  next.currentPlan = normalizePlan(next.currentPlan);
  next.plans = Array.isArray(next.plans) ? next.plans.map(normalizePlan) : [];
  return next;
}

function normalizePlan(plan) {
  return {
    id: plan?.id || null,
    date: plan?.date || new Date().toISOString().slice(0, 10),
    title: plan?.title || '',
    theme: plan?.theme || '',
    progression: plan?.progression || 'Balanced',
    totalMinutes: plan?.totalMinutes || 55,
    notes: plan?.notes || '',
    coachBrain: plan?.coachBrain || null,
    blocks: Array.isArray(plan?.blocks) ? plan.blocks : [],
  };
}

function weightedPick(entries, usedIds, avoidRecent, state) {
  const candidates = entries.filter((d) => !usedIds.has(d.id));
  const pool = candidates.length ? candidates : entries;
  if (!pool.length) return null;
  const weights = pool.map((d) => {
    let weight = 1;
    if (avoidRecent) weight *= fatigueWeight(d.id, state);
    if (d.animated) weight *= 1.35;
    if (d.difficulty === 'intermediate') weight *= 1.1;
    return { d, weight };
  });
  let total = weights.reduce((sum, x) => sum + x.weight, 0);
  let r = Math.random() * total;
  for (const item of weights) {
    r -= item.weight;
    if (r <= 0) return item.d;
  }
  return weights[0].d;
}

function fatigueWeight(drillId, state) {
  const recent = [...(state.plans || [])].sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')).slice(0, 5);
  let weight = 1;
  recent.forEach((plan, i) => {
    if ((plan.blocks || []).some((b) => b.drillId === drillId)) weight = Math.min(weight, [0.18, 0.35, 0.55, 0.75, 0.9][i] || 1);
  });
  return weight;
}

function chooseCategory(weights) {
  const entries = Object.entries(weights);
  let total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let r = Math.random() * total;
  for (const [category, weight] of entries) {
    r -= weight;
    if (r <= 0) return category;
  }
  return entries[0]?.[0] || 'skating';
}

function generateCoachPlan(options, state) {
  const theme = options.theme || 'mixed';
  const progression = options.progression || 'balanced';
  const duration = Number(options.duration || 55);
  const avoidRecent = Boolean(options.avoidRecent);
  const includeGoalie = options.includeGoalie !== false;
  const labels = PROGRESSION_LABELS[progression] || PROGRESSION_LABELS.balanced;
  const weights = THEME_WEIGHTS[theme] || THEME_WEIGHTS.mixed;
  const all = seedAnimatedMatches(state.drills || []);
  const byCategory = all.reduce((map, drill) => {
    const list = map.get(drill.category) || [];
    list.push(drill);
    map.set(drill.category, list);
    return map;
  }, new Map());

  const targetBlocks = duration >= 85 ? 7 : duration >= 70 ? 6 : 5;
  const blockTimes = splitMinutes(duration, targetBlocks);
  const used = new Set();
  const blocks = [];

  const warmup = weightedPick(byCategory.get('skating') || all, used, avoidRecent, state);
  if (warmup) pushBlock(blocks, used, warmup, blockTimes.shift(), labels[0], 'Raise tempo, confirm edges, and set practice pace.');

  while (blocks.length < targetBlocks && blockTimes.length) {
    let category = chooseCategory(weights);
    if (blocks.length === targetBlocks - 1 && theme === 'compete') category = 'battle';
    const pool = byCategory.get(category) || all.filter((d) => d.category !== 'goalie');
    const drill = weightedPick(pool, used, avoidRecent, state) || weightedPick(all, used, avoidRecent, state);
    if (!drill) break;
    const label = labels[Math.min(blocks.length, labels.length - 1)] || `Block ${blocks.length + 1}`;
    pushBlock(blocks, used, drill, blockTimes.shift(), label, buildObjective(drill, theme, progression));
  }

  if (includeGoalie && !blocks.some((b) => all.find((d) => d.id === b.drillId)?.category === 'goalie')) {
    const goalie = weightedPick(byCategory.get('goalie') || [], used, avoidRecent, state);
    if (goalie && blocks.length) {
      const replaceIndex = Math.max(1, blocks.length - 2);
      blocks[replaceIndex] = makeBlock(goalie, Math.max(6, blocks[replaceIndex].minutes), 'Goalie Touch', 'Include goalie-specific reads while skaters rotate through reps.');
    }
  }

  return {
    id: null,
    date: new Date().toISOString().slice(0, 10),
    title: `${titleCase(theme)} Practice — ${titleCase(progression)} Progression`,
    theme: `${titleCase(theme)} / ${titleCase(progression)}`,
    progression: titleCase(progression),
    totalMinutes: duration,
    notes: 'Generated with animated-drill priority, recent-drill avoidance, and progression labels.',
    coachBrain: { theme, progression, animatedBlocks: blocks.length, generatedAt: new Date().toISOString() },
    blocks,
  };
}

function splitMinutes(total, count) {
  const warm = Math.min(8, Math.max(5, Math.round(total * 0.12)));
  const remaining = total - warm;
  const restCount = count - 1;
  const base = Math.floor(remaining / restCount);
  const times = [warm];
  for (let i = 0; i < restCount; i++) times.push(base + (i < remaining % restCount ? 1 : 0));
  return times;
}

function pushBlock(blocks, used, drill, minutes, label, objective) {
  used.add(drill.id);
  blocks.push(makeBlock(drill, minutes, label, objective));
}

function makeBlock(drill, minutes, label, objective) {
  return {
    id: crypto.randomUUID(),
    drillId: drill.id,
    minutes: Math.max(1, minutes || drill.duration || 8),
    label,
    objective,
    coachNote: drill.animated ? 'Animated: use Play in plan or On-Ice Mode to preview movement.' : 'Static: add a diagram sequence in the editor when ready.',
  };
}

function buildObjective(drill, theme, progression) {
  const focus = (drill.skillFocus || [drill.category]).slice(0, 2).join(' + ');
  if (progression === 'pressure') return `Execute ${focus} while pressure increases each rep.`;
  if (progression === 'teach') return `Teach the pattern, freeze once, then run clean ${focus} reps.`;
  if (progression === 'transfer') return `Transfer ${focus} into a game-like read or finish.`;
  if (progression === 'compete') return `Score the rep and keep tempo competitive; reward details.`;
  return `Build ${focus} details inside the ${theme} practice theme.`;
}

function drawDrillDiagram(canvasOrId, drill) {
  if (!drill?.diagram) return;
  drawDiagram(canvasOrId, drill.diagram);
}

function playDrillDiagram(canvasOrId, drill, opts = {}) {
  if (!drill?.diagram) return { stop() {}, pause() {}, resume() {}, restart() {}, isPlaying() { return false; } };
  return playDiagram(canvasOrId, drill.diagram, { msPerArrow: opts.msPerArrow || 950, stepHoldMs: opts.stepHoldMs || 240, ...opts });
}

function titleCase(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  migrateState,
  generateCoachPlan,
  drawDrillDiagram,
  playDrillDiagram,
  getAnimatedLibrary,
};
