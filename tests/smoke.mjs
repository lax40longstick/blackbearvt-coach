import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const file = (path) => new URL(path, root);
['app.html','practice.html','marketplace.html','netlify/functions/ai-practice-builder.js','src/features/practice/drill-scoring.js','src/features/sharing/practice-sharing.js'].forEach((path) => assert.equal(existsSync(file(path)), true, path));
const ai = readFileSync(file('netlify/functions/ai-practice-builder.js'), 'utf8');
assert.match(ai, /OPENAI_API_KEY/);
assert.match(ai, /AI_RATE_LIMIT_PER_MINUTE/);
assert.match(ai, /ai_generation_logs/);
// Guards must be DEFINED ...
assert.match(ai, /function validatePromptSafety/);
assert.match(ai, /function rateLimit/);
assert.match(ai, /async function getOrgPlanForUser/);
assert.match(ai, /async function countAiGenerations/);
// ... and actually CALLED in the handler (this is what the v0.3.7 bug missed)
assert.match(ai, /validatePromptSafety\(payload\)/);
assert.match(ai, /rateLimit\(req,/);
assert.match(ai, /getOrgPlanForUser\(userId\)/);
assert.match(ai, /countAiGenerations\(userId\)/);
// Success-response variables must be in scope (catches the userPlan/used/allowed ReferenceError)
const handlerStart = ai.indexOf('export default async');
assert.ok(handlerStart > 0, 'handler not found');
const handlerBody = ai.slice(handlerStart);
assert.match(handlerBody, /const userPlan = /);
assert.match(handlerBody, /const allowed = /);
assert.match(handlerBody, /const used = /);
const sharing = readFileSync(file('src/features/sharing/practice-sharing.js'), 'utf8');
assert.match(sharing, /exportPracticeToPdf/);
assert.match(sharing, /renderPublicPracticePlan/);
const schema = readFileSync(file('supabase/schema.sql'), 'utf8');
assert.match(schema, /marketplace_plans/);
assert.match(schema, /marketplace_reviews/);
assert.match(schema, /ai_generation_logs/);

// --- v0.3.7-patch.2: app.html refactor step 1 (app-state extraction) ---
const appState = readFileSync(file('src/features/app/app-state.js'), 'utf8');
assert.match(appState, /var state = createDefaultState/);
assert.match(appState, /function save\(\)/);
assert.match(appState, /function loadState\(opts\)/);
assert.match(appState, /window\.saveState = save/);

const appHtml = readFileSync(file('app.html'), 'utf8');
// Must load app-state.js as a NON-module classic script (so its declarations
// are visible by bare name in the inline <script> below).
assert.match(appHtml, /<script src="\.\/src\/features\/app\/app-state\.js"><\/script>/);
// And it must come BEFORE the inline classic <script> block.
const stateScriptIdx = appHtml.indexOf('src/features/app/app-state.js');
const inlineIdx = appHtml.indexOf('// CONSTANTS');
assert.ok(stateScriptIdx > 0 && inlineIdx > stateScriptIdx,
  'app-state.js must be loaded before the inline <script> block');
// And the duplicate inline declarations must be gone (these would shadow / collide).
assert.doesNotMatch(appHtml, /^const STORAGE_KEY = 'bear_den_coach_hq_v1';/m);
assert.doesNotMatch(appHtml, /^let state = \{\n\s*roster: \[\],/m);
assert.doesNotMatch(appHtml, /^function save\(\) \{\n\s*try \{ localStorage\.setItem\(STORAGE_KEY/m);

// --- v0.3.7-patch.3: marketplace checkout ---
assert.equal(existsSync(file('netlify/functions/create-marketplace-checkout.js')), true);
assert.equal(existsSync(file('supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql')), true);
const checkout = readFileSync(file('netlify/functions/create-marketplace-checkout.js'), 'utf8');
assert.match(checkout, /mode: "payment"/);
assert.match(checkout, /already_owned/);
assert.match(checkout, /createFetchHttpClient/);
const webhook = readFileSync(file('netlify/functions/stripe-webhook.js'), 'utf8');
assert.match(webhook, /recordMarketplacePurchase/);
assert.match(webhook, /charge\.refunded/);
const marketplace = readFileSync(file('src/features/marketplace/practice-marketplace.js'), 'utf8');
assert.match(marketplace, /buyMarketplacePlan/);
assert.match(marketplace, /\/api\/create-marketplace-checkout/);

// --- v0.3.7-patch.4: app.html refactor steps 2-4 (roster, practice-ui, game-day) ---
['src/features/roster/roster.js',
 'src/features/practice/practice-ui.js',
 'src/features/game-day/game-day.js'].forEach((p) => assert.equal(existsSync(file(p)), true, p));

const appHtml4 = readFileSync(file('app.html'), 'utf8');
// All three modules must be loaded as classic scripts
assert.match(appHtml4, /<script src="\.\/src\/features\/roster\/roster\.js"><\/script>/);
assert.match(appHtml4, /<script src="\.\/src\/features\/practice\/practice-ui\.js"><\/script>/);
assert.match(appHtml4, /<script src="\.\/src\/features\/game-day\/game-day\.js"><\/script>/);
// And in the right order (state first, then features)
const orderState = appHtml4.indexOf('app-state.js');
const orderRoster = appHtml4.indexOf('roster.js');
const orderPractice = appHtml4.indexOf('practice-ui.js');
const orderGameDay = appHtml4.indexOf('game-day.js');
const orderInline = appHtml4.indexOf('// CONSTANTS');
assert.ok(orderState > 0 && orderRoster > orderState && orderPractice > orderRoster
  && orderGameDay > orderPractice && orderInline > orderGameDay,
  'classic scripts must load in order: app-state -> roster -> practice-ui -> game-day -> inline');

// Functions that moved must NOT have a top-level definition in app.html anymore
// (regex anchored to start-of-line to avoid matching nested closures).
['function addPlayer\\(\\)', 'function renderRoster\\(\\)', 'function renderStats\\(\\)',
 'function renderCurrentPlan\\(\\)', 'function runGenerator\\(\\)', 'function startOnIceMode\\(\\)',
 'function saveGameDay\\(\\)', 'function renderWeekly\\(\\)']
  .forEach((rx) => assert.doesNotMatch(appHtml4, new RegExp('^' + rx, 'm'),
    `${rx} should be moved out of app.html`));

console.log('smoke tests passed');
