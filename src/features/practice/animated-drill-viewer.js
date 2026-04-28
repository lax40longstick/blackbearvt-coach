import { drawDiagram, playDiagram } from '../../../components/diagram.js';
import { renderDrillMediaTabs, hydrateDrillMediaTabs } from './drill-media-tabs.js';

const EMPTY_CONTROLLER = {
  stop() {}, pause() {}, resume() {}, restart() {}, isPlaying() { return false; },
};

function resolveElement(target) {
  if (typeof target === 'string') return document.getElementById(target);
  return target || null;
}

function getDrillDiagram(drill) {
  return drill?.diagram || null;
}

function getSteps(diagram) {
  if (!diagram) return [];
  if (Array.isArray(diagram.sequence) && diagram.sequence.length) {
    return diagram.sequence.map((step, index) => ({
      label: step.label || `Step ${index + 1}`,
      durationMs: step.durationMs || 900,
    }));
  }
  return (diagram.arrows || []).map((arrow, index) => ({
    label: arrow.label || `Movement ${index + 1}`,
    durationMs: arrow.durationMs || 900,
  }));
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function speedToMs(speed) {
  const value = Number(speed || 1);
  return Math.max(280, Math.round(950 / value));
}

export function createAnimatedDrillViewer(containerOrId, drill, options = {}) {
  const container = resolveElement(containerOrId);
  const diagram = getDrillDiagram(drill);
  if (!container) return EMPTY_CONTROLLER;
  if (container.__bdhViewer?.destroy) container.__bdhViewer.destroy();

  const steps = getSteps(diagram);
  const compact = Boolean(options.compact);
  const showTitle = options.showTitle !== false;
  const viewerId = `adv_${Math.random().toString(36).slice(2, 9)}`;
  const initialSpeed = Number(options.speed || 1);

  if (!diagram) {
    container.innerHTML = `<div class="animated-drill-viewer empty">No animated diagram yet. Open Edit Diagram to add movement paths.</div>`;
    return EMPTY_CONTROLLER;
  }

  container.innerHTML = `
    <div class="animated-drill-viewer ${compact ? 'compact' : ''}">
      ${showTitle ? `
        <div class="adv-head">
          <div>
            <div class="adv-kicker">Animated Drill Viewer</div>
            <div class="adv-title">${safeText(drill?.name || 'Drill')}</div>
          </div>
          <div class="adv-badge">${steps.length || 1} step${steps.length === 1 ? '' : 's'}</div>
        </div>` : ''}
      <div class="adv-stage">
        <canvas id="${viewerId}_canvas" class="adv-canvas"></canvas>
        <div class="adv-status" id="${viewerId}_status">Ready</div>
      </div>
      <div class="adv-controls">
        <button class="btn small" id="${viewerId}_play" type="button">▶ Play</button>
        <button class="btn small" id="${viewerId}_restart" type="button">↺ Restart</button>
        <label class="adv-speed">Speed
          <select id="${viewerId}_speed">
            <option value="0.75">0.75x</option>
            <option value="1" selected>1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </label>
      </div>
      <div class="adv-step-label" id="${viewerId}_step">${safeText(steps[0]?.label || 'Press play to animate the drill.')}</div>
      ${compact ? '' : `<div class="adv-timeline" id="${viewerId}_timeline">${steps.map((step, index) => `<button type="button" class="adv-step-pill" data-step="${index}">${index + 1}. ${safeText(step.label)}</button>`).join('')}</div>`}
    </div>`;

  const canvas = document.getElementById(`${viewerId}_canvas`);
  const playButton = document.getElementById(`${viewerId}_play`);
  const restartButton = document.getElementById(`${viewerId}_restart`);
  const speedSelect = document.getElementById(`${viewerId}_speed`);
  const status = document.getElementById(`${viewerId}_status`);
  const stepLabel = document.getElementById(`${viewerId}_step`);
  const timeline = document.getElementById(`${viewerId}_timeline`);
  speedSelect.value = String(initialSpeed);

  let player = null;
  let playerState = 'ready';

  function setStep(index, total, step) {
    const label = step?.label || steps[index]?.label || `Step ${index + 1}`;
    stepLabel.textContent = `${index + 1}/${total}: ${label}`;
    timeline?.querySelectorAll('.adv-step-pill').forEach((pill, i) => pill.classList.toggle('active', i === index));
  }

  function setState(next) {
    playerState = next;
    status.textContent = next === 'playing' ? 'Playing' : next === 'paused' ? 'Paused' : next === 'complete' ? 'Complete' : 'Ready';
    playButton.textContent = next === 'playing' ? '⏸ Pause' : next === 'paused' ? '▶ Resume' : '▶ Play';
  }

  function start() {
    if (playerState === 'playing' && player?.pause) {
      player.pause();
      setState('paused');
      return;
    }
    if (playerState === 'paused' && player?.resume) {
      player.resume();
      setState('playing');
      return;
    }
    if (player?.stop) player.stop(false);
    player = playDiagram(canvas, diagram, {
      msPerArrow: speedToMs(speedSelect.value),
      stepHoldMs: compact ? 130 : 260,
      loop: Boolean(options.loop),
      onStep: setStep,
      onStateChange: setState,
      onComplete: () => {
        setState('complete');
        if (options.onComplete) options.onComplete();
      },
    });
  }

  function restart() {
    if (player?.stop) player.stop(false);
    player = null;
    setState('ready');
    drawDiagram(canvas, diagram);
    start();
  }

  function redraw() {
    if (player?.stop) player.stop(false);
    player = null;
    setState('ready');
    drawDiagram(canvas, diagram);
  }

  playButton.addEventListener('click', start);
  restartButton.addEventListener('click', restart);
  speedSelect.addEventListener('change', () => {
    if (playerState === 'playing') restart();
  });
  timeline?.addEventListener('click', (event) => {
    const pill = event.target.closest('.adv-step-pill');
    if (!pill) return;
    const index = Number(pill.dataset.step || 0);
    setStep(index, steps.length, steps[index]);
  });

  drawDiagram(canvas, diagram);

  const api = {
    play: start,
    pause() { if (player?.pause) player.pause(); setState('paused'); },
    restart,
    stop(redrawCanvas = true) { if (player?.stop) player.stop(redrawCanvas); player = null; setState('ready'); },
    destroy() { if (player?.stop) player.stop(false); container.__bdhViewer = null; },
    redraw,
    isPlaying() { return playerState === 'playing'; },
  };
  container.__bdhViewer = api;
  return api;
}

export function openAnimatedDrillViewer(drillId, state) {
  const drill = (state?.drills || []).find((item) => item.id === drillId);
  const modal = document.getElementById('animatedDrillViewerModal');
  const body = document.getElementById('animatedDrillViewerBody');
  if (!modal || !body || !drill) return;
  body.innerHTML = renderDrillMediaTabs(drill, { compact: false });
  modal.classList.add('show');
  hydrateDrillMediaTabs(body, state);
  const mount = body.querySelector('[id$="_animation"]');
  createAnimatedDrillViewer(mount, drill, { compact: false, showTitle: true });
}

export function closeAnimatedDrillViewer() {
  const modal = document.getElementById('animatedDrillViewerModal');
  const mount = document.getElementById('animatedDrillViewerMount');
  if (mount?.__bdhViewer?.destroy) mount.__bdhViewer.destroy();
  if (modal) modal.classList.remove('show');
}

window.BearDenHQ = {
  ...(window.BearDenHQ || {}),
  createAnimatedDrillViewer,
  openAnimatedDrillViewer,
  closeAnimatedDrillViewer,
};
