/* ==============================================================
   BEAR DEN PLANNER — DIAGRAM RENDERER
   Draws a drill diagram (objects + arrows) over a rink backdrop.
   Supports: straight, curve, dashed, loop arrows.
   ============================================================== */

import { drawRink } from "./rink.js";

const CANVAS_W = 300;
const CANVAS_H = 500;

// Object type → style
const STYLES = {
  player:   { fill: "#1b63c4", stroke: "#0a1830", text: "#fff" },
  forward:  { fill: "#1b63c4", stroke: "#0a1830", text: "#fff" },
  defense:  { fill: "#cc2c2c", stroke: "#0a1830", text: "#fff" },
  defender: { fill: "#f4a44a", stroke: "#0a1830", text: "#1a1200" },
  cone:     { fill: "#f4a44a", stroke: "#1a1200", text: "#1a1200", shape: "triangle" },
  puck:     { fill: "#000",    stroke: "#000",    text: "#fff",    shape: "disk-sm" },
  goal:     { fill: "#cc2c2c", stroke: "#0a1830", text: "#fff",    shape: "square" },
};

export function drawDiagram(canvasOrId, diagram) {
  const safeDiagram = normalizeDiagram(diagram);
  const canvas = typeof canvasOrId === "string"
    ? document.getElementById(canvasOrId)
    : canvasOrId;
  if (!canvas) return;

  // Use HiDPI-aware canvas
  prepareCanvas(canvas, CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Rink
  drawRink(ctx, safeDiagram.rink, CANVAS_W, CANVAS_H);

  // 2. Arrows (drawn UNDER objects so objects cap the line)
  for (const a of safeDiagram.arrows) {
    drawArrow(ctx, a, safeDiagram.objects);
  }

  // 3. Objects
  for (const o of safeDiagram.objects) {
    drawObject(ctx, o);
  }
}

// Ensure crisp rendering on retina without blowing up layout.
function prepareCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  // Leave CSS width/height to the stylesheet. Scale the backing.
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawObject(ctx, o) {
  const s = STYLES[o.type] || STYLES.player;
  const shape = s.shape || "circle";
  const r = o.type === "puck" ? 5 : 14;

  ctx.save();

  if (shape === "circle") {
    ctx.fillStyle = s.fill;
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (o.label) {
      ctx.fillStyle = s.text;
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.label, o.x, o.y + 0.5);
    }
  } else if (shape === "triangle") {
    drawTriangle(ctx, o.x, o.y, r, s);
  } else if (shape === "disk-sm") {
    ctx.fillStyle = s.fill;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "square") {
    ctx.fillStyle = s.fill;
    ctx.fillRect(o.x - 12, o.y - 8, 24, 16);
    ctx.strokeStyle = s.stroke;
    ctx.strokeRect(o.x - 12, o.y - 8, 24, 16);
  }

  ctx.restore();
}

function drawTriangle(ctx, x, y, r, s) {
  ctx.fillStyle = s.fill;
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.lineTo(x - r, y + r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawArrow(ctx, a, objects) {
  const from = objects.find(o => o.id === a.from);
  const to   = objects.find(o => o.id === a.to);
  if (!from || !to) return;

  const style = a.style || "straight";
  ctx.save();
  ctx.strokeStyle = "#0a1830";
  ctx.fillStyle = "#0a1830";
  ctx.lineWidth = 2.2;
  if (a.dashed) ctx.setLineDash([5, 4]);

  if (style === "curve") {
    drawCurve(ctx, from, to);
  } else if (style === "loop") {
    drawLoop(ctx, from, to);
  } else {
    drawStraight(ctx, from, to);
  }

  ctx.restore();
}

function drawStraight(ctx, from, to) {
  // Shorten both ends so arrow doesn't stab through circles
  const [x1, y1, x2, y2] = trim(from.x, from.y, to.x, to.y, 16);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  drawArrowHead(ctx, x1, y1, x2, y2);
}

function drawCurve(ctx, from, to) {
  // Control point offset perpendicular to midpoint
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.min(40, len * 0.25);
  const cx = mx + nx * bend;
  const cy = my + ny * bend;

  const [x1, y1, , ] = trim(from.x, from.y, cx, cy, 16);
  const [, , x2, y2] = trim(cx, cy, to.x, to.y, 16);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // Arrowhead tangent = direction from control point to end
  drawArrowHead(ctx, cx, cy, x2, y2);
}

function drawLoop(ctx, from, to) {
  // Curl around the "from" point — used for wheel patterns behind net.
  const r = 24;
  ctx.beginPath();
  ctx.arc(from.x, from.y, r, Math.PI * 0.25, Math.PI * 1.75, false);
  ctx.stroke();

  // Then draw straight segment from loop end to target
  const endAngle = Math.PI * 1.75;
  const lx = from.x + Math.cos(endAngle) * r;
  const ly = from.y + Math.sin(endAngle) * r;
  const [x1, y1, x2, y2] = trim(lx, ly, to.x, to.y, 16);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  drawArrowHead(ctx, x1, y1, x2, y2);
}

function drawArrowHead(ctx, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 7),
             toY - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 7),
             toY - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

// Shortens a segment by `pad` pixels on each end so arrows don't
// overlap circle objects.
function trim(x1, y1, x2, y2, pad) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < pad * 2) return [x1, y1, x2, y2];
  const ux = dx / len;
  const uy = dy / len;
  return [x1 + ux * pad, y1 + uy * pad, x2 - ux * pad, y2 - uy * pad];
}

// ==============================================================
// ANIMATION PLAYBACK
// Walks through the arrows in sequence, animating a puck/token
// traveling along each path. Returns a control object:
//   { stop() }   so the caller can cancel mid-play.
// ==============================================================
export function playDiagram(canvasOrId, diagram, opts = {}) {
  const safeDiagram = normalizeDiagram(diagram);
  const canvas = typeof canvasOrId === "string"
    ? document.getElementById(canvasOrId)
    : canvasOrId;
  if (!canvas) return { stop() {} };

  prepareCanvas(canvas, CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop() {} };
  const steps = getPlaybackSteps(safeDiagram);
  const objects = safeDiagram.objects;
  const {
    msPerArrow = 900,
    stepHoldMs = 180,
    loop = false,
    onComplete = () => {},
    onStep = () => {},
    onStateChange = () => {},
  } = opts;

  let cancelled = false;
  let rafId = null;
  let timeoutId = null;
  let paused = false;
  let stepIndex = 0;
  let stepStart = 0;
  let elapsedBeforePause = 0;

  function drawBase(withArrows, focusedIds = []) {
    const focusSet = new Set(focusedIds);
    drawRink(ctx, safeDiagram.rink, CANVAS_W, CANVAS_H);
    for (const a of withArrows) drawArrow(ctx, a, objects);
    for (const o of objects) {
      if (focusSet.has(o.id)) drawFocusRing(ctx, o);
      drawObject(ctx, o);
    }
  }

  // Compute a point along an arrow at time t∈[0,1]
  function pointAlong(arrow, t) {
    return pointAlongArrow(arrow, t, objects);
  }

  function pointAlongStep(step, t) {
    const arrow = step.arrows[step.arrows.length - 1];
    return arrow ? pointAlong(arrow, t) : null;
  }

  function drawFrame(step, progress) {
    const completedArrows = steps
      .slice(0, stepIndex)
      .flatMap((entry) => entry.arrows);
    drawBase(completedArrows, step.focusIds);

    for (let i = 0; i < step.arrows.length; i++) {
      const arrow = step.arrows[i];
      const isLastArrow = i === step.arrows.length - 1;
      if (!isLastArrow || progress >= 1) {
        drawArrow(ctx, arrow, objects);
      } else {
        drawPartialArrow(ctx, arrow, objects, progress);
      }
    }

    const tokenPoint = pointAlongStep(step, progress);
    if (tokenPoint) drawMovingToken(ctx, tokenPoint, step.tokenColor);
  }

  function scheduleNextStep() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (cancelled || paused) return;
      const nextIndex = stepIndex + 1;
      if (nextIndex >= steps.length) {
        if (loop && steps.length) {
          stepIndex = 0;
          startStep(performance.now());
          return;
        }
        onStateChange("complete");
        onComplete();
        return;
      }
      stepIndex = nextIndex;
      startStep(performance.now());
    }, stepHoldMs);
  }

  function tick(now) {
    if (cancelled || paused) return;
    const step = steps[stepIndex];
    const duration = step.durationMs || msPerArrow;
    const elapsed = elapsedBeforePause + (now - stepStart);
    const progress = duration > 0 ? Math.min(1, elapsed / duration) : 1;

    drawFrame(step, progress);

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    elapsedBeforePause = 0;
    scheduleNextStep();
  }

  function startStep(now = performance.now()) {
    const step = steps[stepIndex];
    stepStart = now;
    elapsedBeforePause = 0;
    onStep(stepIndex, steps.length, step);
    onStateChange("playing");
    drawFrame(step, 0);
    rafId = requestAnimationFrame(tick);
  }

  function stopPlayback(redraw = true) {
    cancelled = true;
    paused = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (timeoutId) clearTimeout(timeoutId);
    if (redraw) drawDiagram(canvas, safeDiagram);
    onStateChange("stopped");
  }

  function pausePlayback() {
    if (paused || cancelled || !steps.length) return;
    paused = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (timeoutId) clearTimeout(timeoutId);
    elapsedBeforePause += performance.now() - stepStart;
    onStateChange("paused");
  }

  function resumePlayback() {
    if (!paused || cancelled || !steps.length) return;
    paused = false;
    stepStart = performance.now();
    onStateChange("playing");
    rafId = requestAnimationFrame(tick);
  }

  function animateFromStart() {
    if (cancelled) return;
    stepIndex = 0;
    startStep(performance.now());
  }

  // Start
  if (!steps.length) {
    drawBase([]);
    setTimeout(() => onComplete(), 50);
  } else {
    drawBase([]);
    animateFromStart();
  }

  return {
    stop() { stopPlayback(true); },
    pause() { pausePlayback(); },
    resume() { resumePlayback(); },
    restart() {
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      cancelled = false;
      paused = false;
      animateFromStart();
    },
    isPlaying() { return !paused && !cancelled; },
  };
}

function normalizeDiagram(diagram) {
  if (!diagram || typeof diagram !== "object") {
    return { rink: "half_ice", objects: [], arrows: [] };
  }

  return {
    rink: diagram.rink || "half_ice",
    objects: Array.isArray(diagram.objects) ? diagram.objects.filter(isDiagramObject) : [],
    arrows: Array.isArray(diagram.arrows) ? diagram.arrows.filter(isDiagramArrow) : [],
    sequence: Array.isArray(diagram.sequence) ? diagram.sequence.filter(isPlaybackStep) : [],
  };
}

function isDiagramObject(object) {
  return object
    && typeof object === "object"
    && Number.isFinite(object.x)
    && Number.isFinite(object.y);
}

function isDiagramArrow(arrow) {
  return arrow
    && typeof arrow === "object"
    && typeof arrow.from === "string"
    && typeof arrow.to === "string";
}

function isPlaybackStep(step) {
  return step && typeof step === "object";
}

function getPlaybackSteps(diagram) {
  if (diagram.sequence.length) {
    return diagram.sequence
      .map((step, index) => normalizePlaybackStep(step, diagram, index))
      .filter(Boolean);
  }

  return diagram.arrows.map((arrow, index) => ({
    label: arrow.label || describeArrow(arrow, diagram.objects),
    focusIds: [arrow.from, arrow.to],
    arrows: [arrow],
    durationMs: arrow.durationMs || 900,
    tokenColor: arrow.tokenColor || "#f4a44a",
  }));
}

function normalizePlaybackStep(step, diagram, index) {
  const arrows = resolveStepArrows(step, diagram.arrows);
  const focusIds = Array.isArray(step.focusIds) && step.focusIds.length
    ? step.focusIds.filter(Boolean)
    : arrows.flatMap((arrow) => [arrow.from, arrow.to]).filter(Boolean);

  if (!arrows.length && !focusIds.length) return null;

  return {
    label: step.label || `Step ${index + 1}`,
    focusIds: [...new Set(focusIds)],
    arrows,
    durationMs: step.durationMs || 900,
    tokenColor: step.tokenColor || "#f4a44a",
  };
}

function resolveStepArrows(step, arrows) {
  if (Array.isArray(step.arrowIndexes)) {
    return step.arrowIndexes
      .map((index) => arrows[index])
      .filter(Boolean);
  }
  if (Array.isArray(step.arrows)) {
    return step.arrows.filter(isDiagramArrow);
  }
  return [];
}

function describeArrow(arrow, objects) {
  const from = objects.find((object) => object.id === arrow.from);
  const to = objects.find((object) => object.id === arrow.to);
  const fromLabel = from?.label || from?.id || "Start";
  const toLabel = to?.label || to?.id || "Finish";
  return `${fromLabel} to ${toLabel}`;
}

function drawFocusRing(ctx, object) {
  ctx.save();
  ctx.strokeStyle = "rgba(244, 164, 74, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(object.x, object.y, object.type === "puck" ? 10 : 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMovingToken(ctx, point, color) {
  ctx.save();
  ctx.fillStyle = color || "#f4a44a";
  ctx.shadowColor = color || "#f4a44a";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPartialArrow(ctx, arrow, objects, progress) {
  const from = objects.find((object) => object.id === arrow.from);
  const to = objects.find((object) => object.id === arrow.to);
  if (!from || !to) return;

  ctx.save();
  ctx.strokeStyle = "#0a1830";
  ctx.fillStyle = "#0a1830";
  ctx.lineWidth = 2.2;
  if (arrow.dashed) ctx.setLineDash([5, 4]);

  if (arrow.style === "curve") {
    const control = getCurveControlPoint(from, to);
    const partial = pointAlongArrow(arrow, progress, objects);
    if (!partial) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.cx, control.cy, partial.x, partial.y);
    ctx.stroke();
  } else {
    const partial = pointAlongArrow(arrow, progress, objects);
    if (!partial) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(partial.x, partial.y);
    ctx.stroke();
  }

  ctx.restore();
}

function getCurveControlPoint(from, to) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.min(40, len * 0.25);
  return { cx: mx + nx * bend, cy: my + ny * bend };
}

function pointAlongArrow(arrow, t, objects) {
  const from = objects.find((object) => object.id === arrow.from);
  const to = objects.find((object) => object.id === arrow.to);
  if (!from || !to) return null;

  if (arrow.style === "curve") {
    const control = getCurveControlPoint(from, to);
    const mt = 1 - t;
    return {
      x: mt * mt * from.x + 2 * mt * t * control.cx + t * t * to.x,
      y: mt * mt * from.y + 2 * mt * t * control.cy + t * t * to.y,
    };
  }

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}
