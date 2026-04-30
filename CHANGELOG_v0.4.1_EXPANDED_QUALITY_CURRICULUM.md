# Changelog — v0.4.1 "quality drills, matched animations, real curriculum"

## Drill quality expansion
- Replaced the small quality pack with 47 curated elite drills.
- Every elite drill now owns a specific `diagram` with arrows and a 4-step playback `sequence`.
- Added `animationKey`, `animationSummary`, `qualityScore`, richer coaching points, mistakes, progressions, regressions, equipment, age levels, ice usage, and goalie metadata.

## AI/practice selection upgrade
- The local practice generator now uses `drillFitScore(...)` instead of just category/random weighting.
- Drill selection prioritizes:
  - age fit
  - requested focus/theme
  - elite quality score
  - matched animation sequence length
  - goalie preference
  - recent-drill avoidance
- The AI builder now sends `qualityScore` and `fitScore` to the Netlify function.
- The AI prompt now explicitly tells the model to prefer high-fit/high-quality drills and only use animations that match the teaching objective.

## Season curriculum builder
- Added `src/features/practice/season-curriculum.js`.
- The season planner now builds a 12-week long-term curriculum, not just a 4-week progression.
- Supports focus-specific plans for mixed, skating, passing, breakout, and compete themes.
- Each week includes:
  - label
  - teaching progression
  - practice theme
  - summary
  - measurement cue
  - generated practice plan

## Validation
- `node --check` passed for new/changed JS modules.
- `npm run build` passed in this environment.
- Full `npm test` could not complete because this container does not have installed npm dependencies for `@supabase/supabase-js`; run `npm install` then `npm test` locally or in Netlify CI.
