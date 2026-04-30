# Changelog — v0.4.0 Quality Drills + Matched Animations

This update fixes the biggest product-quality issue: generated practices felt weak and drill animations did not reliably match the drill objective.

## Added

- `data/elite-drills.js`
  - Adds an elite starter drill pack with drill-specific animated diagrams and explicit playback sequences.
  - Each drill includes realistic coaching points, instructions, common mistakes, progressions, regressions, duration, setup complexity, age levels, and skill focus.

## Improved

- Practice builder now imports and prefers elite drills before generic library drills.
- Local practice generation now weights elite drills significantly higher than generic animated drills.
- Drills with explicit `diagram.sequence` receive additional preference over simple arrow-only diagrams.
- Practice blocks now carry a real `teachingMoment` from the drill animation sequence.
- Practice block coach notes now use actual drill coaching points when available.
- AI compact drill payload now includes:
  - quality flag
  - animation step labels
  - coaching points
  - common mistakes
  - progressions
- AI system prompt now tells the model not to choose drills merely because they are animated; animation steps and coaching points must match the objective.
- Drill media coaching tab now renders arrays properly instead of dumping raw array text.
- Drill media coaching tab now shows animation checkpoints, common mistakes, progressions, and regressions.

## Why this matters

Before this update, a practice might select a passing drill but show a generic lane animation, which made the app feel cheap. The new elite drill pack makes the first generated practices feel more like real on-ice coaching plans.

## Human follow-up needed

- Add 30–50 more elite drills over time.
- Add real demo videos to the best drills.
- Have 3–5 experienced coaches review the elite pack and revise wording/routes.
- Add age-specific versions of the best drills for 8U, 10U, 12U, 14U, and HS.
