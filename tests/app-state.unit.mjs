// Unit test for src/features/app/app-state.js
// Loads the file into a sandbox with mocked window + localStorage and verifies
// that the refactored state helpers behave correctly.
//
// Run with: node tests/app-state.unit.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/features/app/app-state.js", import.meta.url), "utf8");

// --- Build a sandbox that looks like a browser window ---
const storage = new Map();
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const sandbox = {
  console,
  crypto: { randomUUID: () => `id-${Math.random().toString(36).slice(2, 10)}` },
  localStorage,
  Object,
  JSON,
  Date,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (err) { fail++; console.error(`  ✗ ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log("app-state.js unit tests\n");

check("constants are defined", () => {
  assert.equal(sandbox.STORAGE_KEY, "bear_den_coach_hq_v1");
  assert.equal(sandbox.LEGACY_STORAGE_KEY, "bb_coach_v3");
});

check("createDefaultState returns expected shape", () => {
  const fresh = sandbox.createDefaultState();
  // Cross-realm objects have different prototype chains, so compare via JSON.
  assert.equal(JSON.stringify(fresh.roster), "[]");
  assert.equal(JSON.stringify(fresh.games), "[]");
  assert.equal(fresh.currentPlan.progression, "Balanced");
  assert.equal(fresh.ui.currentPage, "dash");
  assert.ok(fresh.lines.F1 && fresh.lines.D1 && fresh.lines.G);
});

check("emptyLines returns the correct line config", () => {
  const lines = sandbox.emptyLines();
  assert.equal(JSON.stringify(lines.F1.players), "[null,null,null]");
  assert.equal(JSON.stringify(lines.D1.players), "[null,null]");
  assert.equal(JSON.stringify(lines.G.players), "[null]");
});

check("state global is initialized and on window", () => {
  assert.ok(sandbox.state, "state should be defined");
  assert.equal(sandbox.window.state, sandbox.state, "window.state must be same ref");
});

check("save() writes JSON to STORAGE_KEY", () => {
  storage.clear();
  sandbox.state.roster = [{ id: "x", name: "Test", pos: "F", num: "10" }];
  sandbox.save();
  const raw = storage.get(sandbox.STORAGE_KEY);
  assert.ok(raw, "save() should write to localStorage");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.roster[0].name, "Test");
});

check("loadState seeds preloaded data on first run", () => {
  storage.clear();
  // Reset state by reassigning via the script (use createDefaultState through window)
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  let sortCalls = 0;
  const result = sandbox.loadState({
    preloadedDrills: [{ name: "Drill A", category: "skating", duration: 5 }],
    preloadedRoster: [{ name: "Player A", pos: "F", num: "1" }],
    sortRoster: () => { sortCalls++; },
  });
  assert.equal(result.drills.length, 1);
  assert.equal(result.drills[0].name, "Drill A");
  assert.equal(result.drills[0].isCustom, false);
  assert.equal(result.drills[0].usage, 0);
  assert.ok(result.drills[0].id, "drill should get an id");
  assert.equal(result.roster.length, 1);
  assert.equal(sortCalls, 1, "sortRoster should be called when seeding roster");
  // Dates should be initialized
  assert.match(result.currentPlan.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(result.weekly.weekOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(result.gameDay.date, /^\d{4}-\d{2}-\d{2}$/);
});

check("loadState restores from primary STORAGE_KEY", () => {
  storage.clear();
  storage.set(sandbox.STORAGE_KEY, JSON.stringify({
    roster: [{ id: "p1", name: "Saved", pos: "F", num: "99" }],
    drills: [{ id: "d1", name: "Existing" }],
  }));
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  const result = sandbox.loadState({ preloadedDrills: [], preloadedRoster: [] });
  assert.equal(result.roster[0].name, "Saved");
  assert.equal(result.drills[0].name, "Existing");
});

check("loadState falls back to LEGACY_STORAGE_KEY when primary missing", () => {
  storage.clear();
  storage.set(sandbox.LEGACY_STORAGE_KEY, JSON.stringify({
    roster: [{ id: "old", name: "Legacy", pos: "F", num: "1" }],
    drills: [{ id: "d1", name: "Legacy Drill" }],
  }));
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  const result = sandbox.loadState({ preloadedDrills: [], preloadedRoster: [] });
  assert.equal(result.roster[0].name, "Legacy");
  assert.equal(result.drills[0].name, "Legacy Drill");
});

check("loadState does not call sortRoster when roster already populated", () => {
  storage.clear();
  storage.set(sandbox.STORAGE_KEY, JSON.stringify({
    roster: [{ id: "p1", name: "Existing", pos: "F", num: "1" }],
    drills: [{ id: "d1", name: "Existing" }],
  }));
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  let sortCalls = 0;
  sandbox.loadState({
    preloadedDrills: [],
    preloadedRoster: [{ name: "P", pos: "F", num: "1" }],
    sortRoster: () => { sortCalls++; },
  });
  assert.equal(sortCalls, 0, "sortRoster should NOT fire when roster already loaded");
});

check("loadState invokes ensureDevelopment hook", () => {
  storage.clear();
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  let invoked = false;
  sandbox.loadState({
    preloadedDrills: [],
    preloadedRoster: [],
    ensureDevelopment: (s) => { invoked = true; s.__devTouched = true; },
  });
  assert.equal(invoked, true);
  assert.equal(sandbox.state.__devTouched, true);
});

check("window.saveState alias points at save", () => {
  assert.equal(sandbox.window.saveState, sandbox.save);
});

check("malformed JSON in localStorage does not crash loadState", () => {
  storage.clear();
  storage.set(sandbox.STORAGE_KEY, "{{not json");
  vm.runInContext("state = createDefaultState(); window.state = state;", sandbox);
  // Should not throw
  const result = sandbox.loadState({ preloadedDrills: [], preloadedRoster: [] });
  // Defaults still intact
  assert.equal(result.currentPlan.progression, "Balanced");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
