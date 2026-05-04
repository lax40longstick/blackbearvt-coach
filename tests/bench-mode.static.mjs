import { readFileSync } from 'node:fs';

const bench = readFileSync('src/features/bench/bench-mode.js', 'utf8');
const app = readFileSync('app.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const benchPage = readFileSync('bench.html', 'utf8');
const standalone = readFileSync('src/features/bench/bench-standalone.js', 'utf8');

const requiredBenchHooks = [
  'preloadPracticeForBench',
  'startBenchMode',
  'startOfflinePackUI',
  'applyBenchPresetUI',
  'swapCurrentDrillUI',
  'saveBenchNoteUI',
  'publishBenchRecapUI',
  'normalizePreset',
];
for (const hook of requiredBenchHooks) {
  if (!bench.includes(hook)) throw new Error(`Bench Mode missing ${hook}`);
}

const requiredPresets = ['half-ice', 'full-ice', 'no-goalie', 'low-numbers', 'stations', 'compete-more', 'simplify', 'make-harder'];
for (const preset of requiredPresets) {
  if (!bench.includes(preset)) throw new Error(`Bench Mode missing preset ${preset}`);
}

for (const asset of ['./app.html', './bench.html', './bench-mode.html', './src/features/bench/bench-mode.js', './src/features/bench/bench-standalone.js']) {
  if (!sw.includes(asset)) throw new Error(`Service worker does not cache ${asset}`);
}

if (!app.includes('id="benchModeMount"')) throw new Error('app.html missing Bench Mode mount');
if (!app.includes('./src/features/bench/bench-mode.js')) throw new Error('app.html missing Bench Mode script');
if (!benchPage.includes('data-bench-standalone="true"')) throw new Error('bench.html missing standalone body marker');
if (!benchPage.includes('./src/features/bench/bench-standalone.js')) throw new Error('bench.html missing standalone Bench Mode script');
for (const required of ['applyPreset', 'swapCurrent', 'completePractice', 'renderDiagram']) {
  if (!standalone.includes(required)) throw new Error(`bench-standalone.js missing ${required}`);
}

console.log('bench-mode static tests passed');
