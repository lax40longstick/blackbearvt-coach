# Changelog — v0.3.7-patch.2 app.html refactor (step 1 of 5)

## Refactor

- Extracted global state helpers from `app.html` into
  `src/features/app/app-state.js`. Per HUMAN_LAUNCH_PLAN §7 step 1.
- `app.html`: 4,721 → 4,665 lines (−56). Inline classic `<script>` no longer
  declares `STORAGE_KEY`, `LEGACY_STORAGE_KEY`, `emptyLines`, the `state`
  initializer, or `save()`. `load()` is now a thin wrapper that injects
  app-level domain constants (`PRELOADED_*`, `sortRoster`) into the new
  `loadState()` helper.
- Loaded as a non-module classic script (`<script src="...">`) BEFORE the
  inline app code so its `var`/`function` declarations are visible by bare
  name to existing inline code — no call sites changed.

## Fixed (latent bug)

- `practice-marketplace.js` calls `window.saveState?.()` and reads
  `window.state`, but `app.html` never set those. The new module exposes both
  explicitly, so marketplace imports now actually persist instead of silently
  failing the optional-chained call.

## Tests

- Added `tests/app-state.unit.mjs`: 12 checks covering constants,
  `createDefaultState`, `emptyLines`, `save`, all `loadState` paths
  (first-run seeding, primary key restore, legacy-key fallback,
  ensureDevelopment hook, malformed-JSON recovery), and the `window.saveState`
  alias. Runs in a `vm.createContext` sandbox with mocked `localStorage`.
- Strengthened `tests/smoke.mjs`: asserts `app-state.js` is loaded as a
  non-module script BEFORE the inline `<script>` block, and that the original
  duplicate inline declarations are gone.
- `npm test` now runs 29 checks across 3 files. `npm run test:state` runs
  only the new unit tests.

## Files changed

- `src/features/app/app-state.js` (new)
- `app.html` (deletions + new script tag + thin `load()` wrapper)
- `tests/smoke.mjs`
- `tests/app-state.unit.mjs` (new)
- `package.json` (test scripts)

## Next refactor steps (per launch plan)

1. ✅ `app-state.js` extraction (this patch)
2. Roster/stat rendering → `src/features/roster/`
3. Practice plan rendering → `src/features/practice/practice-ui.js`
4. Game-day packet → `src/features/game-day/`
5. Keep `app.html` as shell only
