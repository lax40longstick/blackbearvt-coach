// Load test: simulate the browser's classic-script load order for the
// extracted modules. Catches top-level errors (e.g. ReferenceError from a
// missing global) that static parsing misses.
//
// Run with: node tests/classic-scripts.load.mjs

import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

// --- Minimal browser-like sandbox ---
const noop = () => null;
const elementProxy = new Proxy({}, {
  get: (_, prop) => {
    if (prop === "addEventListener" || prop === "removeEventListener") return noop;
    if (prop === "appendChild" || prop === "insertBefore") return noop;
    if (prop === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
    if (prop === "dataset") return {};
    if (prop === "style") return {};
    if (prop === "value") return "";
    if (prop === "innerHTML" || prop === "textContent") return "";
    if (prop === "querySelectorAll") return () => [];
    if (prop === "querySelector") return () => elementProxy;
    return undefined;
  },
  set: () => true,
});

const sandbox = {
  console,
  crypto: { randomUUID: () => "id-" + Math.random().toString(36).slice(2, 10) },
  localStorage: {
    _data: new Map(),
    getItem(k) { return this._data.get(k) ?? null; },
    setItem(k, v) { this._data.set(k, String(v)); },
    removeItem(k) { this._data.delete(k); },
  },
  document: {
    getElementById: () => elementProxy,
    querySelector: () => elementProxy,
    querySelectorAll: () => [],
    addEventListener: noop,
    createElement: () => elementProxy,
    body: elementProxy,
    head: elementProxy,
  },
  Object, Array, JSON, Date, Math, String, Number, Boolean, Promise,
  Set, Map, WeakMap, WeakSet, Symbol, RegExp, Error,
  setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
  fetch: () => Promise.resolve({ ok: false, json: async () => ({}) }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.navigator = { onLine: true, share: undefined, wakeLock: undefined };
vm.createContext(sandbox);

// --- Inject the app-level constants that the inline app.html script normally
// declares before any of the extracted modules run. We have to do this because
// the extracted modules reference these globals by bare name. ---
const stub = `
  var STORAGE_KEY, LEGACY_STORAGE_KEY;  // set by app-state.js
  var state, save, loadState;            // set by app-state.js
  var CATEGORIES = [];
  var PRELOADED_DRILLS = [];
  var PRELOADED_ROSTER = [];
  var LINE_CONFIG = {
    F1:{type:'fwd',label:'Line 1',positions:['LW','C','RW']},
    F2:{type:'fwd',label:'Line 2',positions:['LW','C','RW']},
    F3:{type:'fwd',label:'Line 3',positions:['LW','C','RW']},
    F4:{type:'fwd',label:'Line 4',positions:['LW','C','RW']},
    D1:{type:'def',label:'D-Pair 1',positions:['LD','RD']},
    D2:{type:'def',label:'D-Pair 2',positions:['LD','RD']},
    D3:{type:'def',label:'D-Pair 3',positions:['LD','RD']},
    G:{type:'goal',label:'Starter',positions:['G']},
  };
  var TAGS = ['pp1','pp2','pk1','pk2','match'];
  var TAG_LABELS = { pp1:'PP1', pp2:'PP2', pk1:'PK1', pk2:'PK2', match:'KEY' };
  var BearDenEditor = null, BearDenCloud = null;
  var deferredPrompt = null;
  function toast(){}
  function escapeHtml(s){ return String(s ?? ''); }
  function formatDateShort(){ return ''; }
  function formatTime(){ return ''; }
  function navTo(){}
  function renderDashboard(){}
`;

const files = [
  ["stubs",         stub],
  ["app-state.js",  read("src/features/app/app-state.js")],
  ["roster.js",     read("src/features/roster/roster.js")],
  ["practice-ui.js",read("src/features/practice/practice-ui.js")],
  ["game-day.js",   read("src/features/game-day/game-day.js")],
];

let pass = 0, fail = 0;
for (const [name, code] of files) {
  try {
    vm.runInContext(code, sandbox, { filename: name });
    console.log(`  ✓ ${name} loaded`);
    pass++;
  } catch (err) {
    console.error(`  ✗ ${name} FAILED at top level`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split("\n").slice(0, 5).join("\n"));
    fail++;
    process.exitCode = 1;
  }
}

// Spot-check that key functions from each module are now reachable as globals
const expected = [
  "STORAGE_KEY", "save", "loadState",            // state
  "addPlayer", "renderRoster", "renderStats",    // roster
  "renderCurrentPlan", "runGenerator",           // practice-ui
  "saveGameDay", "renderWeekly",                 // game-day
];
for (const name of expected) {
  if (typeof sandbox[name] === "undefined") {
    console.error(`  ✗ expected global "${name}" is undefined`);
    fail++;
    process.exitCode = 1;
  } else {
    pass++;
    console.log(`  ✓ global ${name} reachable`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
