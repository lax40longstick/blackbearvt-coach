# Changelog — v0.3.7-patch.4 app.html refactor (steps 2-4 of 5)

## Refactor

Completes HUMAN_LAUNCH_PLAN §7 steps 2, 3, and 4 in a single patch (per
explicit user request, against the launch plan's "one section per release"
default — mitigated by the new runtime load test described below).

### Step 2 — Roster, lines, stats, games
Extracted to `src/features/roster/roster.js` (574 lines). Owns 22 functions:
`addPlayer`, `sortRoster`, `deletePlayer`, `updatePlayerNum`, `cyclePlayerPos`,
`renderRoster`, `populateRosterDatalist`, `renderLines`, `renderLineRow`,
`toggleTag`, `openPlayerPicker`, `closePlayerPicker`, `pickPlayer`,
`clearSlotFromPicker`, `clearLines`, `saveConfig`, `loadConfig`,
`renderConfigSelect`, `computeSkaterStats`, `computeGoalieStats`, `renderStats`,
plus the games CRUD: `renderGamesList`, `openGameEntry`, `closeGameEntry`,
`renderGameEntryTables`, `saveGameFromEntry`, `deleteGameFromEntry`. Also
brought the inline `addEventListener` block on `#page-stats` headers along
with it.

### Step 3 — Practice UI
Extracted to `src/features/practice/practice-ui.js` (957 lines). Owns 40+
functions across three originally-discontiguous sections of `app.html`:
- **Practice plan**: `renderCurrentPlan`, `completeCurrentPractice`,
  `playPlanDiagram`, `renderPlanBudget`, `saveCurrentPlan`, `addDrillToPlan`,
  `updateBlockMinutes`, `removeBlock`, `clearCurrentPlan`, `saveNamedPlan`,
  `loadSavedPlan`, `deleteSavedPlan`, `renderSavedPlans`, `renderSeasonPlanner`,
  `buildSeasonPlan`, `openSeasonWeek`, `regenerateSeasonWeek`,
  `renderDrillList`, `setDrillFilter`, `openAnimatedViewer`,
  `closeAnimatedViewer`, `openDrillCreator`, `closeDrillEditor`,
  `saveDrillFromEditor`, `deleteCurrentDrill`, `bindEditorToolbar`,
  `toggleEditorRink`, `undoEditorChange`, `clearEditorCanvas`
- **Practice generator**: `runGenerator`, `updateGenProgression`,
  `renderAIPracticeSummary`, plus the `THEME_WEIGHTS` constant
- **On-ice mode**: `startOnIceMode`, `closeOnIceMode`, `releaseWakeLock`,
  `renderOnIceMode`, `oiPrev`, `oiNext`, `oiToggleTimer`, `oiStartTimer`,
  `oiStopTimer`, `oiResetTimer`, `oiAddMinute`, `updateTimerButton`, plus
  the `oiTimerInterval`, `oiDiagramPlayer`, `wakeLock`, `oiSwipeStartX`
  module-scoped state

### Step 4 — Game day & weekly
Extracted to `src/features/game-day/game-day.js` (241 lines). Owns 7 functions:
`saveGameDay`, `renderGameDayPacket`, `renderWeekly`, `populateWeeklyForm`,
`buildWeeklyPlainText`, `copyWeeklyUpdate`, `openWeeklyInEmail`.

### Step 5 — `app.html` as shell
Not a separate step. With steps 1-4 complete, `app.html` is now mostly the
HTML shell + the smaller cross-cutting glue (dashboard, navigation, action
sheet, import/export/reset, PWA install, utilities, init). At 2,990 lines
it's still bigger than ideal but every standalone feature has been pulled
into its own module.

## Sizes

| File | Before patch.4 | After patch.4 | Delta |
|---|---|---|---|
| `app.html` | 4,121 | **2,990** | −1,131 |
| `src/features/roster/roster.js` | — | 574 | new |
| `src/features/practice/practice-ui.js` | — | 957 | new |
| `src/features/game-day/game-day.js` | — | 241 | new |

Cumulative across the v0.3.7 refactor (patches 2 + 4):
**`app.html` 4,665 → 2,990 lines (−1,675, −36%)**.

## Required collateral change

- `BearDenEditor` and `BearDenCloud` were `let`-declared in the inline app
  script (script-scoped, not global). The practice-ui module reads
  `BearDenEditor`, so it would have been invisible across the file boundary.
  Changed to `var` so the bindings live on the global object. `BearDenCloud`
  is still only consumed inline but flipped for consistency. No behavior
  change for the inline code.

## Tests

### New: `tests/classic-scripts.load.mjs` (15 checks)

This is the most important test we added this session. It loads each
extracted classic script in the same order the browser will, into a
`vm.createContext` sandbox with mocked `window`/`document`/`localStorage`,
then asserts that every key global function from each file is reachable.

It catches the failure mode that static parsing cannot: a module that
declares a function fine in isolation but throws at top-level load because
it references an undeclared identifier. With four interdependent classic
scripts now loading in sequence, this is the failure mode most likely to
slip through review.

### Strengthened: `tests/smoke.mjs`

Added 13 new assertions covering:
- All three new module files exist
- All three are loaded as `<script src="...">` (classic, not module)
- The script tags appear in the correct order
  (`app-state.js → roster.js → practice-ui.js → game-day.js → inline`)
- 8 representative functions (`addPlayer`, `renderRoster`, `renderStats`,
  `renderCurrentPlan`, `runGenerator`, `startOnIceMode`, `saveGameDay`,
  `renderWeekly`) no longer have a top-level definition in `app.html`

### `npm test` totals

| | Before this session | After patch.4 |
|---|---|---|
| Test files | 1 | 5 |
| Total checks | 4 (smoke greps) | **55** |

New `npm` scripts: `test:load` runs only the new load test.

## What this does NOT prove

The static + sandboxed tests are strong evidence but cannot replace a real
browser load. **Before committing this patch, please run the app locally
and click through every page once:**

```bash
npm run config:build && npm run dev
# open http://localhost:3000/app.html
```

Visit each tab in order: Dashboard, Roster, Lines, Stats, Games, Practice,
Game Day, Weekly. Open the browser console (F12) and confirm:
- No red errors at page load
- Each tab renders its content (even if empty-state)
- Adding a player, clicking a line slot, and editing a game still work
- The practice generator's "Quick Build" button still produces a plan
- The on-ice mode opens (you don't need to actually run a practice)

If anything throws, the console error will tell us exactly which extracted
function or which inline call site needs an adjustment. Paste it and I'll
patch it.

## Files changed / added

- `app.html` (1,675-line reduction across patches 2+4)
- `src/features/roster/roster.js` (new)
- `src/features/practice/practice-ui.js` (new)
- `src/features/game-day/game-day.js` (new)
- `tests/smoke.mjs` (extended)
- `tests/classic-scripts.load.mjs` (new)
- `package.json` (`test`, `test:load` scripts)

## Refactor backlog: COMPLETE

| Step | Status |
|---|---|
| 1. Extract `app-state.js` | ✅ patch.2 |
| 2. Extract roster/stat rendering | ✅ patch.4 |
| 3. Extract practice plan rendering | ✅ patch.4 |
| 4. Extract game-day packet | ✅ patch.4 |
| 5. `app.html` as shell only | ✅ patch.4 |

The `app.html` shell still contains some non-shell glue (dashboard, action
sheet, cloud settings, generator preview rendering). These are not standalone
features and don't belong in a feature module — they're the cross-cutting
top-level orchestrator. Further splitting is possible but would be cosmetic
not architectural.
