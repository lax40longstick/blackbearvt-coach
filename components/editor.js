/* ==============================================================
   BEAR DEN PLANNER — DRILL EDITOR
   Exports: openEditor({ onSave, initial }) which mounts the
   interactive canvas into #editorCanvas AFTER the DOM has the el.
   All state is kept in module-scope (single editor at a time).
   ============================================================== */

import { drawRink } from "./rink.js";

const CANVAS_W = 300;
const CANVAS_H = 500;

let state = null;   // { tool, objects, arrows, selectedForArrow, dragging, canvas, ctx }

export function openEditor({ onSave, initial } = {}) {
  // Wait a tick for the screen render to complete
  requestAnimationFrame(() => {
    const canvas = document.getElementById("editorCanvas");
    if (!canvas) return;

    // HiDPI-aware
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state = {
      tool: "player",
      rink: initial?.rink || "half_ice",
      objects: initial?.objects ? clone(initial.objects) : [],
      arrows:  initial?.arrows  ? clone(initial.arrows)  : [],
      selectedForArrow: null,
      dragging: null,
      dragMoved: false,
      canvas,
      ctx,
      onSave,
    };

    attachEvents(canvas);
    updateToolbar();
    render();
  });
}

function attachEvents(canvas) {
  // Pointer events unify mouse + touch.
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup",   onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
}

function toCanvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  const y = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
  return { x, y };
}

function onPointerDown(e) {
  if (!state) return;
  e.preventDefault();
  const { x, y } = toCanvasCoords(e, state.canvas);

  const hit = findObject(x, y);

  if (state.tool === "arrow") {
    if (hit) {
      if (!state.selectedForArrow) {
        state.selectedForArrow = hit;
      } else if (state.selectedForArrow.id !== hit.id) {
        state.arrows.push({
          from: state.selectedForArrow.id,
          to: hit.id,
          style: "curve",
        });
        state.selectedForArrow = null;
      } else {
        state.selectedForArrow = null;
      }
      render();
    }
    return;
  }

  if (state.tool === "delete") {
    if (hit) {
      state.objects = state.objects.filter(o => o.id !== hit.id);
      state.arrows  = state.arrows.filter(a => a.from !== hit.id && a.to !== hit.id);
      render();
    }
    return;
  }

  if (state.tool === "move") {
    state.dragging = hit;
    state.dragMoved = false;
    return;
  }

  // Placement tools: if clicking an existing object, start dragging it
  // instead of stacking a new one on top.
  if (hit) {
    state.dragging = hit;
    state.dragMoved = false;
    return;
  }

  // Otherwise place a new object.
  state.objects.push({
    id: "obj_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type: state.tool,
    label: labelFor(state.tool),
    x,
    y,
  });
  render();
}

function onPointerMove(e) {
  if (!state || !state.dragging) return;
  e.preventDefault();
  const { x, y } = toCanvasCoords(e, state.canvas);
  state.dragging.x = x;
  state.dragging.y = y;
  state.dragMoved = true;
  render();
}

function onPointerUp() {
  if (!state) return;
  state.dragging = null;
}

function findObject(x, y) {
  // iterate in reverse so topmost object wins
  for (let i = state.objects.length - 1; i >= 0; i--) {
    const o = state.objects[i];
    if (Math.hypot(o.x - x, o.y - y) < 18) return o;
  }
  return null;
}

function labelFor(type) {
  switch (type) {
    case "forward":  return "F";
    case "defense":  return "D";
    case "defender": return "X";
    case "player":   return "P";
    default:         return "";
  }
}

// -------------- RENDER -----------------------------------------
function render() {
  if (!state) return;
  const { ctx } = state;
  drawRink(ctx, state.rink, CANVAS_W, CANVAS_H);

  // Arrows
  for (const a of state.arrows) {
    const from = state.objects.find(o => o.id === a.from);
    const to   = state.objects.find(o => o.id === a.to);
    if (!from || !to) continue;
    drawCurveArrow(ctx, from, to);
  }

  // Objects
  for (const o of state.objects) {
    drawEditorObject(ctx, o, state.selectedForArrow?.id === o.id);
  }
}

function drawEditorObject(ctx, o, selected) {
  const colors = {
    player:   { fill: "#1b63c4", text: "#fff" },
    forward:  { fill: "#1b63c4", text: "#fff" },
    defense:  { fill: "#cc2c2c", text: "#fff" },
    defender: { fill: "#f4a44a", text: "#1a1200" },
    cone:     { fill: "#f4a44a", text: "#1a1200" },
    puck:     { fill: "#000",    text: "#fff" },
  }[o.type] || { fill: "#1b63c4", text: "#fff" };

  ctx.save();
  if (selected) {
    ctx.strokeStyle = "#f4a44a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (o.type === "cone") {
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = "#0a1830";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y - 12);
    ctx.lineTo(o.x + 12, o.y + 12);
    ctx.lineTo(o.x - 12, o.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (o.type === "puck") {
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = "#0a1830";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (o.label) {
      ctx.fillStyle = colors.text;
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.label, o.x, o.y + 0.5);
    }
  }
  ctx.restore();
}

function drawCurveArrow(ctx, from, to) {
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

  ctx.save();
  ctx.strokeStyle = "#0a1830";
  ctx.fillStyle = "#0a1830";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(cx, cy, to.x, to.y);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(to.y - cy, to.x - cx);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 7),
             to.y - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7),
             to.y - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// -------------- TOOLBAR CALLBACKS ------------------------------
export function setTool(tool) {
  if (!state) return;
  state.tool = tool;
  state.selectedForArrow = null;
  updateToolbar();
  render();
}
export function clearDiagram() {
  if (!state) return;
  state.objects = [];
  state.arrows  = [];
  state.selectedForArrow = null;
  render();
}
export function toggleRink() {
  if (!state) return;
  state.rink = state.rink === "half_ice" ? "quarter_ice" : "half_ice";
  render();
}
export function undoLast() {
  if (!state) return;
  if (state.arrows.length) {
    state.arrows.pop();
  } else if (state.objects.length) {
    const removed = state.objects.pop();
    state.arrows = state.arrows.filter(a => a.from !== removed.id && a.to !== removed.id);
  }
  render();
}
export function getEditorDiagram() {
  if (!state) return null;
  return {
    rink: state.rink,
    objects: clone(state.objects),
    arrows: clone(state.arrows),
  };
}
export function closeEditor() {
  state = null;
}

function updateToolbar() {
  document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tool === state.tool);
  });
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }
