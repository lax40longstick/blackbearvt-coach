/* ==============================================================
   BEAR DEN PLANNER — RINK RENDERER
   Draws half-ice or quarter-ice background on a 300x500 canvas.
   ============================================================== */

// Colors tuned for light ice background.
const ICE_BG    = "#ffffff";
const RED_LINE  = "#cc2c2c";
const BLUE_LINE = "#1b63c4";
const FAINT     = "#c9d4e0";
const CREASE    = "#d2e5ff";
const CREASE_LN = "#1b63c4";
const GOAL      = "#cc2c2c";

export function drawRink(ctx, type = "half_ice", w = 300, h = 500) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Ice background with rounded rect for rink shape
  const pad = 10;
  const r = 40;
  roundedRect(ctx, pad, pad, w - pad * 2, h - pad * 2, r);
  ctx.fillStyle = ICE_BG;
  ctx.fill();
  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (type === "quarter_ice") {
    drawQuarterIce(ctx, w, h);
  } else {
    drawHalfIce(ctx, w, h);
  }

  ctx.restore();
}

// ---- Half ice: goal at top, blue line across, center red line bottom --
function drawHalfIce(ctx, w, h) {
  const cx = w / 2;

  // Goal line (top)
  ctx.strokeStyle = RED_LINE;
  ctx.lineWidth = 2;
  line(ctx, 20, 55, w - 20, 55);

  // Crease (semicircle)
  ctx.fillStyle = CREASE;
  ctx.strokeStyle = CREASE_LN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, 55, 28, 0, Math.PI, false);
  ctx.fill();
  ctx.stroke();

  // Net
  ctx.fillStyle = GOAL;
  ctx.fillRect(cx - 14, 40, 28, 14);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 14, 40, 28, 14);

  // Blue line (offensive zone end)
  ctx.strokeStyle = BLUE_LINE;
  ctx.lineWidth = 4;
  line(ctx, 20, 170, w - 20, 170);

  // Top faceoff dots (offensive zone)
  dot(ctx, cx - 60, 110, 3, RED_LINE);
  dot(ctx, cx + 60, 110, 3, RED_LINE);
  faceoffCircle(ctx, cx - 60, 110, 26);
  faceoffCircle(ctx, cx + 60, 110, 26);

  // Center red line (bottom of half ice = mid rink)
  ctx.strokeStyle = RED_LINE;
  ctx.lineWidth = 4;
  dashedLine(ctx, 20, 435, w - 20, 435);

  // Center faceoff dot
  dot(ctx, cx, 435, 4, BLUE_LINE);
  faceoffCircle(ctx, cx, 435, 32);

  // Neutral zone faceoff dots
  dot(ctx, cx - 60, 305, 3, RED_LINE);
  dot(ctx, cx + 60, 305, 3, RED_LINE);
}

// ---- Quarter ice: small zone view, offensive zone tight --
function drawQuarterIce(ctx, w, h) {
  const cx = w / 2;

  // Goal line
  ctx.strokeStyle = RED_LINE;
  ctx.lineWidth = 2;
  line(ctx, 20, 80, w - 20, 80);

  // Crease
  ctx.fillStyle = CREASE;
  ctx.strokeStyle = CREASE_LN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, 80, 32, 0, Math.PI, false);
  ctx.fill();
  ctx.stroke();

  // Net
  ctx.fillStyle = GOAL;
  ctx.fillRect(cx - 16, 60, 32, 18);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 16, 60, 32, 18);

  // Zone faceoff dots
  dot(ctx, cx - 80, 160, 4, RED_LINE);
  dot(ctx, cx + 80, 160, 4, RED_LINE);
  faceoffCircle(ctx, cx - 80, 160, 38);
  faceoffCircle(ctx, cx + 80, 160, 38);

  // Dashed "boundary" line (end of quarter-ice station)
  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 2;
  dashedLine(ctx, 20, 420, w - 20, 420);
}

// ---- Primitives -----------------------------------------------
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function dashedLine(ctx, x1, y1, x2, y2) {
  ctx.save();
  ctx.setLineDash([6, 4]);
  line(ctx, x1, y1, x2, y2);
  ctx.restore();
}
function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function faceoffCircle(ctx, x, y, r) {
  ctx.strokeStyle = RED_LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
