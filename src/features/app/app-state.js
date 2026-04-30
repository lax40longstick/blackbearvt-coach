// src/features/app/app-state.js
// -----------------------------------------------------------------------------
// Global state helpers for BenchBoss Coach HQ.
//
// Loaded as a NON-module script before the main inline <script> block in
// app.html so its declarations are visible by bare name to inline code:
//
//     <script src="./src/features/app/app-state.js"></script>   <-- this file
//     <script>...uses STORAGE_KEY, state, save, load by name...</script>
//
// Refactor step 1 of the launch plan §7. Keeps domain data (drills, roster
// constants) inline in app.html — those move in step 2/3.
//
// Exposes:
//   STORAGE_KEY, LEGACY_STORAGE_KEY  — localStorage keys
//   emptyLines()                     — line-config factory
//   createDefaultState()             — returns a fresh state object
//   state                            — the live state (mutable global)
//   save()                           — persists state to localStorage
//   loadState({...})                 — reads localStorage, migrates, seeds
//   window.state, window.saveState   — explicit aliases for ES-module callers
//                                      (e.g. practice-marketplace.js)
// -----------------------------------------------------------------------------

var STORAGE_KEY = 'bear_den_coach_hq_v1';
var LEGACY_STORAGE_KEY = 'bb_coach_v3';

function emptyLines() {
  return {
    F1: { players: [null, null, null], tags: [] },
    F2: { players: [null, null, null], tags: [] },
    F3: { players: [null, null, null], tags: [] },
    F4: { players: [null, null, null], tags: [] },
    D1: { players: [null, null], tags: [] },
    D2: { players: [null, null], tags: [] },
    D3: { players: [null, null], tags: [] },
    G:  { players: [null], tags: [] },
  };
}

function createDefaultState() {
  return {
    roster: [],
    games: [],
    drills: [],
    lines: emptyLines(),
    configs: {},
    plans: [],
    currentPlan: { id: null, date: '', title: '', theme: '', progression: 'Balanced', totalMinutes: 55, notes: '', blocks: [] },
    gameDay: { opponent: '', date: '', puck: '', homeAway: 'H', rink: '', jersey: 'Black', arrival: '', lineConfig: '', keyPlayers: '', tendencies: '', matchups: '', coachPoints: '' },
    weekly: {
      weekOf: '', weekNum: '',
      practiceA: { date: '', theme: '', work: '' },
      practiceB: { date: '', theme: '', work: '' },
      potw: { name: '', num: '', category: '', reason: '' },
      reminders: '',
    },
    seasons: [],
    ui: {
      currentPage: 'dash',
      statSort: { key: 'pts', asc: false },
      drillCategoryFilter: null,
      pickerContext: null,
      editingGameId: null,
      editingDrillId: null,
      genTheme: 'mixed',
      genProgression: 'balanced',
      oiIndex: 0,
      oiTimerRunning: false,
      oiTimerRemaining: 0,
      oiTimerStartTime: 0,
      oiPlan: null,
    },
  };
}

// `var` so the binding goes on the global object — required because callers
// in app.html and ES modules both read/mutate this. `let`/`const` at top level
// of a non-module script are NOT exposed on window.
var state = createDefaultState();
window.state = state;

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed', e);
  }
}

// loadState reads localStorage, applies the legacy-key fallback, and seeds
// first-run defaults. Dependencies (preloaded data + sortRoster) are passed in
// so this module stays free of domain-specific data.
//
// Returns the loaded state object (also reassigned to the global `state` and
// mirrored on window.state).
function loadState(opts) {
  var preloadedDrills = (opts && opts.preloadedDrills) || [];
  var preloadedRoster = (opts && opts.preloadedRoster) || [];
  var sortRosterFn = opts && opts.sortRoster;
  var ensureDevelopment = opts && opts.ensureDevelopment;

  try {
    var saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      state = Object.assign({}, state, parsed);
      window.state = state;
    }
  } catch (e) {
    console.error('Load failed', e);
  }

  if (!state.drills || state.drills.length === 0) {
    state.drills = preloadedDrills.map(function (d) {
      return Object.assign({ id: crypto.randomUUID() }, d, { isCustom: false, usage: 0 });
    });
  }

  if (!state.roster || state.roster.length === 0) {
    state.roster = preloadedRoster.map(function (p) {
      return Object.assign({ id: crypto.randomUUID() }, p);
    });
    if (typeof sortRosterFn === 'function') sortRosterFn();
  }

  if (!state.currentPlan.date) state.currentPlan.date = new Date().toISOString().slice(0, 10);
  if (!state.currentPlan.progression) state.currentPlan.progression = 'Balanced';
  if (!state.weekly.weekOf) state.weekly.weekOf = new Date().toISOString().slice(0, 10);
  if (!state.gameDay.date) state.gameDay.date = new Date().toISOString().slice(0, 10);

  if (typeof ensureDevelopment === 'function') ensureDevelopment(state);

  return state;
}

// Aliases for ES-module callers that use camelCase global names.
// (e.g. src/features/marketplace/practice-marketplace.js calls window.saveState)
window.saveState = save;
window.loadState = loadState;
window.createDefaultState = createDefaultState;
window.emptyLines = emptyLines;
