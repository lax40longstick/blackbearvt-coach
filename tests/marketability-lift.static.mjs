import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');

for (const path of [
  'data/elite-drills-pack-2.js',
  'data/elite-drills-pack-3.js',
  'club.html',
  'youth-hockey-practice-plans.html',
  'animated-drills.html',
  'half-ice-practice-plans.html',
  'small-area-games.html',
  'seasonal-templates.html',
  'src/features/club/director-dashboard.js',
  'src/features/club/director-store.js',
  'supabase/migrations/v0.10.0-marketability-lift.sql',
  'PILOT_PROGRAM_v0.10.0.md',
]) {
  assert.equal(existsSync(path), true, `${path} missing`);
}

const engine = read('src/features/practice/practice-engine.js');
assert.match(engine, /eliteDrillsPack2/);
assert.match(engine, /eliteDrillsPack3/);
assert.match(engine, /\[\.\.\.eliteDrills,\s*\.\.\.eliteDrillsPack2,\s*\.\.\.eliteDrillsPack3/);

const pack3 = read('data/elite-drills-pack-3.js');
const drillIds = [...pack3.matchAll(/\['q\d+'/g)].map(m => m[0]);
assert.ok(drillIds.length >= 50, `expected 50+ pack-3 drills, found ${drillIds.length}`);
assert.match(pack3, /animationSummary/);
assert.match(pack3, /coaching_points/);

const sw = read('sw.js');
for (const asset of ['elite-drills-pack-2.js', 'elite-drills-pack-3.js', 'club.html', 'youth-hockey-practice-plans.html', 'seasonal-templates.html']) {
  assert.match(sw, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

const analytics = read('src/lib/analytics.js');
assert.match(analytics, /benchboss_analytics_offline_queue_v1/);
assert.match(analytics, /trackOfflineEvent/);
assert.match(analytics, /appVersion: "0.11.0"/);

const bench = read('src/features/bench/bench-mode.js');
assert.match(bench, /bench_mode_opened/);
assert.match(bench, /drill_swapped/);
assert.match(bench, /practice_completed/);

const standalone = read('src/features/bench/bench-standalone.js');
assert.match(standalone, /bench_mode_opened/);
assert.match(standalone, /drill_swapped/);
assert.match(standalone, /practice_completed/);

const parent = read('src/features/team-hub/parent-portal.js');
assert.match(parent, /parent_recap_viewed/);

const rls = read('supabase/migrations/v0.10.0-marketability-lift.sql');
assert.match(rls, /force row level security/);
assert.match(rls, /team_player_public_cards/);
assert.match(rls, /team_public_source_links/);
assert.match(rls, /team_players_select_coaches_managers/);
assert.doesNotMatch(rls, /team_players_select_viewers[\s\S]*create policy team_players_select_viewers/);

console.log('marketability-lift static tests passed');
