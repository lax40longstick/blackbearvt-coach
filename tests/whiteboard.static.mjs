import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');

for (const path of [
  'coach.html',
  'whiteboard.html',
  'src/features/whiteboard/coach-whiteboard.js',
]) {
  assert.equal(existsSync(path), true, `${path} missing`);
}

const wb = read('src/features/whiteboard/coach-whiteboard.js');
for (const required of [
  'renderWhiteboardApp',
  'openFromDrill',
  'openFromCurrentDrill',
  'openBlank',
  'drawRink',
  'drawFullRink',
  'drawHalfRink',
  'undo',
  'redo',
  'duplicateSketchImpl',
  'attachToPracticeImpl',
  'exportImageImpl',
  'exportPdfImpl',
  'drill-freeze-frame',
]) {
  assert.match(wb, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `whiteboard missing ${required}`);
}

for (const requiredTool of ['data-wb-tool="pen"', 'data-wb-tool="arrow"', 'data-wb-tool="player"', 'data-wb-tool="puck"', 'data-wb-tool="cone"', 'data-wb-tool="erase"', 'data-wb-tool="move"', 'data-wb-action="undo"', 'data-wb-action="redo"']) {
  assert.match(wb, new RegExp(requiredTool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `whiteboard missing ${requiredTool}`);
}

const app = read('app.html');
assert.match(app, /id="page-whiteboard"/);
assert.match(app, /id="whiteboardMount"/);
assert.match(app, /src="\.\/src\/features\/whiteboard\/coach-whiteboard\.js"/);
assert.match(app, /data-nav="whiteboard"/);
assert.match(app, /Freeze \+ Annotate/);

const animated = read('src/features/practice/animated-drill-viewer.js');
assert.match(animated, /Freeze \+ Annotate/);
assert.match(animated, /BenchBossWhiteboard\.openFromDrill/);

const bench = read('src/features/bench/bench-mode.js');
assert.match(bench, /BenchBossWhiteboard/);
assert.match(bench, /whiteboard\.html/);

const standalone = read('src/features/bench/bench-standalone.js');
assert.match(standalone, /whiteboard\.html/);
assert.match(standalone, /Freeze \+ Annotate/);

const manifest = read('manifest.json');
assert.match(manifest, /Coach Whiteboard/);
assert.match(manifest, /whiteboard\.html/);
assert.match(manifest, /coach\.html/);

const sw = read('sw.js');
for (const asset of ['./coach.html', './whiteboard.html', './src/features/whiteboard/coach-whiteboard.js']) {
  assert.match(sw, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `service worker missing ${asset}`);
}

console.log('whiteboard static tests passed');
