/* BenchBoss Coach HQ - Season Curriculum Builder v0.4.1
   Builds a real long-term coaching progression, not just four random weeks. */

const CURRICULUMS = {
  mixed: [
    ['Assessment + habits', 'teach', 'skating', 'Set tempo, edges, passing habits, and baseline compete.'],
    ['Puck support basics', 'teach', 'passing', 'Teach support triangles and passing in stride.'],
    ['Breakout foundations', 'teach', 'breakout', 'Install low support and first-pass habits.'],
    ['Transition attack', 'transfer', 'transition', 'Move from skills into rush reads and support.'],
    ['Compete + body position', 'compete', 'compete', 'Win pucks safely using feet, hips, and second effort.'],
    ['D-zone coverage', 'teach', 'defense', 'Protect dangerous ice and build net-front habits.'],
    ['Forecheck routes', 'teach', 'forecheck', 'Install F1/F2/F3 structure and reload habits.'],
    ['Small-area decisions', 'pressure', 'compete', 'Make faster decisions under constraints.'],
    ['Shooting + rebounds', 'transfer', 'shooting', 'Create shot timing, traffic, and second chances.'],
    ['Special teams intro', 'teach', 'mixed', 'Introduce PP/PK spacing and pressure triggers.'],
    ['Game transfer week', 'transfer', 'mixed', 'Blend systems into flow drills and competitive games.'],
    ['Review + tournament practice', 'compete', 'mixed', 'Review priorities and finish with confidence.'],
  ],
  skating: [
    ['Edge baseline', 'teach', 'skating', 'Mechanics, posture, inside/outside edges.'],
    ['Stops + starts', 'pressure', 'skating', 'Acceleration and direction changes.'],
    ['Transitions', 'teach', 'skating', 'Forward/backward pivots with control.'],
    ['Overspeed', 'pressure', 'skating', 'Speed without losing hockey posture.'],
    ['Puck added', 'transfer', 'puck', 'Keep skill while moving fast.'],
    ['Skating in battles', 'compete', 'compete', 'Use feet to win pucks.'],
    ['Skating into attack', 'transfer', 'transition', 'Carry speed into decisions.'],
    ['Conditioning with purpose', 'compete', 'skating', 'Game-like conditioning.'],
    ['Review edges', 'teach', 'skating', 'Clean up weak patterns.'],
    ['High-tempo reps', 'pressure', 'skating', 'Consistency at speed.'],
    ['Game transfer', 'transfer', 'mixed', 'Skating details inside games.'],
    ['Final challenge', 'compete', 'compete', 'Race/compete confidence week.'],
  ],
  passing: [
    ['Passing habits', 'teach', 'passing', 'Targets, communication, passing in stride.'],
    ['Support after pass', 'teach', 'passing', 'Move after passing and build triangles.'],
    ['Pressure passing', 'pressure', 'passing', 'Pass before pressure arrives.'],
    ['Breakout passing', 'transfer', 'breakout', 'First pass and wall support.'],
    ['Transition passing', 'transfer', 'transition', 'Regroup and rush support.'],
    ['Small-area possession', 'compete', 'compete', 'Use passing to keep possession.'],
    ['Low-to-high offense', 'transfer', 'forecheck', 'Cycle, point shots, and rebound routes.'],
    ['Decision week', 'pressure', 'transition', 'Pass, shoot, or hold based on read.'],
    ['One-touch week', 'pressure', 'passing', 'Quicker puck movement.'],
    ['Team concept blend', 'transfer', 'mixed', 'Pass details inside systems.'],
    ['Game transfer', 'compete', 'mixed', 'Scored games with passing constraints.'],
    ['Review + confidence', 'compete', 'passing', 'Build confidence and polish.'],
  ],
  breakout: [
    ['Routes and support', 'teach', 'breakout', 'Teach low center and wall support.'],
    ['Pressure read', 'pressure', 'breakout', 'First forechecker changes the read.'],
    ['Reverse option', 'teach', 'breakout', 'D-to-D and reverse communication.'],
    ['Weak-side exit', 'transfer', 'transition', 'Exit with speed and width.'],
    ['Breakout to rush', 'transfer', 'transition', 'Turn clean exits into attack.'],
    ['Rim retrievals', 'pressure', 'breakout', 'Shoulder checks and retrieval habits.'],
    ['D-zone pressure', 'teach', 'defense', 'Coverage supports clean exits.'],
    ['Forecheck counter', 'pressure', 'breakout', 'Solve F1/F2 pressure.'],
    ['Small-area breakout game', 'compete', 'compete', 'Game constraints for exits.'],
    ['Full sequence', 'transfer', 'mixed', 'Breakout, regroup, attack.'],
    ['Game transfer', 'compete', 'mixed', 'Breakout details in scrimmage.'],
    ['Review + test', 'compete', 'breakout', 'Measure clean exits and speed.'],
  ],
  compete: [
    ['Body position', 'teach', 'compete', 'Inside hands, low hips, safe contact habits.'],
    ['Puck protection', 'teach', 'puck', 'Protect puck and find support.'],
    ['Corner battles', 'compete', 'compete', 'Win, bump, attack net.'],
    ['Net-front battles', 'compete', 'compete', 'Box out, rebounds, second effort.'],
    ['Small-area decisions', 'pressure', 'compete', 'Compete with decisions.'],
    ['Transition compete', 'transfer', 'transition', 'Win pucks and attack quickly.'],
    ['Forecheck compete', 'pressure', 'forecheck', 'Pressure routes and puck recovery.'],
    ['Defensive compete', 'teach', 'defense', 'Protect dangerous ice.'],
    ['Scored games', 'compete', 'compete', 'Use scoring to drive habits.'],
    ['Fatigue compete', 'pressure', 'skating', 'Detail under fatigue.'],
    ['Game transfer', 'transfer', 'mixed', 'Compete inside team play.'],
    ['Final tournament', 'compete', 'mixed', 'Confidence and accountability.'],
  ],
};

function addWeeks(dateString, weeks) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

function titleCase(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSeasonCurriculum(options = {}, state = {}) {
  const focus = options.focus || 'mixed';
  const startDate = options.startDate || new Date().toISOString().slice(0, 10);
  const weeksRequested = Number(options.weeks || 12);
  const duration = Number(options.duration || 60);
  const ageGroup = options.ageGroup || '10U';
  const includeGoalie = options.includeGoalie !== false;
  const template = CURRICULUMS[focus] || CURRICULUMS.mixed;
  const weekCount = Math.max(4, Math.min(24, weeksRequested));

  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const [label, progression, theme, summary] = template[index % template.length];
    const practice = window.BearDenHQ?.generateCoachPlan?.({
      theme,
      progression,
      duration,
      avoidRecent: index !== 0,
      ageGroup,
      includeGoalie,
      focus: `${focus} ${label} ${summary}`,
    }, state) || null;

    if (practice) {
      practice.title = `Week ${index + 1}: ${label}`;
      practice.date = addWeeks(startDate, index);
      practice.curriculum = { focus, label, summary, week: index + 1, weekCount };
      practice.notes = `${summary} ${practice.notes || ''}`.trim();
    }

    return {
      week: index + 1,
      label,
      summary,
      progression,
      theme,
      date: addWeeks(startDate, index),
      objectives: buildObjectives(theme, progression, summary),
      measurement: buildMeasurement(theme),
      practice,
    };
  });

  return {
    id: `season_${Date.now()}`,
    focus,
    name: `${titleCase(focus)} ${weekCount}-Week Coaching Curriculum`,
    startDate,
    duration,
    ageGroup,
    includeGoalie,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

function buildObjectives(theme, progression, summary) {
  return [
    summary,
    progression === 'teach' ? 'Slow the first rep, freeze the teaching point, then run clean reps.' : 'Progress from controlled reps into pressure or scoring.',
    theme === 'compete' ? 'Track winners and reward safe second effort.' : 'Keep one simple cue for the entire practice.',
  ];
}

function buildMeasurement(theme) {
  const map = {
    passing: 'Count completed passes in stride during game-transfer block.',
    breakout: 'Track clean exits within five seconds of retrieval.',
    transition: 'Track correct pass/shoot decisions, not just goals.',
    compete: 'Track puck wins plus second-effort rebounds.',
    defense: 'Track net-front box outs and clears.',
    skating: 'Track posture and acceleration through final cone/line.',
  };
  return map[theme] || 'Track whether the main teaching cue appears during the final game block.';
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  buildSeasonCurriculum,
};
