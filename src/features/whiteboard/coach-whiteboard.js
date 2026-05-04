// BenchBoss Coach HQ v0.11.0 — Coach Whiteboard / Draw Board
// -----------------------------------------------------------------------------
// Tablet-first PWA whiteboard for rink diagrams, drill freeze-frame annotation,
// Apple Pencil/stylus drawing, and saved practice sketches. Built as a classic
// script so app.html, bench.html, and whiteboard.html can all share the feature.
(function benchBossCoachWhiteboard() {
  const VERSION = '0.11.0';
  const STORAGE_KEY = 'benchboss_whiteboard_sketches_v1';
  const ACTIVE_KEY = 'benchboss_whiteboard_active_v1';
  const OFFLINE_PACK_KEY = 'benchboss_bench_offline_pack_v1';
  const BOARD_W = 1200;
  const BOARD_H = 720;
  const DRILL_W = 300;
  const DRILL_H = 500;

  const COLORS = {
    ice: '#f8fcff', line: '#b8c7d9', red: '#d92332', blue: '#2468c9', crease: '#d9edff', black: '#061015',
    forward: '#1b63c4', defense: '#cc2c2c', opponent: '#f4a44a', cone: '#f59e0b', puck: '#050505', accent: '#7dd3d8', ink: '#0a1830',
  };

  let board = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function uid(prefix = 'wb') {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }
  function nowIso() { return new Date().toISOString(); }
  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.log(`[Whiteboard] ${message}`);
  }
  function track(event, props = {}) {
    try { window.BearDenHQ?.trackEvent?.(event, { feature: 'whiteboard', version: VERSION, ...props }); } catch {}
  }
  function getGlobalState() {
    return window.state || null;
  }
  function saveGlobalState() {
    if (typeof window.save === 'function') window.save();
    else if (typeof window.saveState === 'function') window.saveState();
  }
  function ensureWhiteboardState(appState = getGlobalState()) {
    if (appState) {
      appState.whiteboard = appState.whiteboard || { sketches: [], recentSketchId: null, settings: {} };
      if (!Array.isArray(appState.whiteboard.sketches)) appState.whiteboard.sketches = [];
      if (!appState.whiteboard.settings) appState.whiteboard.settings = {};
      return appState.whiteboard;
    }
    return { sketches: readSketches(), recentSketchId: null, settings: {} };
  }
  function readSketches() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function writeSketches(sketches) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify((sketches || []).slice(0, 200))); } catch {}
  }
  function getSketches() {
    const appState = getGlobalState();
    if (appState?.whiteboard?.sketches) return appState.whiteboard.sketches;
    return readSketches();
  }
  function setSketches(sketches) {
    const cleaned = (sketches || []).slice(0, 200);
    const appState = getGlobalState();
    if (appState) {
      ensureWhiteboardState(appState).sketches = cleaned;
      saveGlobalState();
    }
    writeSketches(cleaned);
  }
  function readActiveSeed() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (!raw) return null;
      localStorage.removeItem(ACTIVE_KEY);
      return JSON.parse(raw);
    } catch { return null; }
  }
  function writeActiveSeed(seed) {
    try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(seed || {})); } catch {}
  }
  function readOfflinePack() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || 'null'); } catch { return null; }
  }
  function allDrills(appState = getGlobalState()) {
    const stateDrills = appState?.drills || [];
    const pack = readOfflinePack();
    const packDrills = pack?.drills || [];
    const map = new Map();
    [...stateDrills, ...packDrills].forEach(d => { if (d?.id) map.set(d.id, d); });
    return [...map.values()];
  }
  function findDrill(drillId, appState = getGlobalState()) {
    return allDrills(appState).find(d => d.id === drillId) || null;
  }
  function currentPractice(appState = getGlobalState()) {
    return appState?.currentPlan || readOfflinePack()?.plan || null;
  }
  function currentBlock(appState = getGlobalState()) {
    const plan = currentPractice(appState);
    const index = appState?.ui?.oiIndex || 0;
    return (plan?.blocks || [])[Math.max(0, Math.min(index, (plan?.blocks || []).length - 1))] || null;
  }

  function createSketch(seed = {}) {
    const plan = currentPractice();
    return {
      id: seed.id || uid('sketch'),
      title: seed.title || defaultTitle(seed),
      rink: seed.rink || rinkFromDrill(seed.drill) || 'full',
      practiceId: seed.practiceId || plan?.id || null,
      practiceTitle: seed.practiceTitle || plan?.title || '',
      drillId: seed.drill?.id || seed.drillId || null,
      drillName: seed.drill?.name || seed.drillName || '',
      freezeStep: Number.isFinite(Number(seed.freezeStep)) ? Number(seed.freezeStep) : null,
      background: seed.background || backgroundFromSeed(seed),
      strokes: clone(seed.strokes || []),
      arrows: clone(seed.arrows || []),
      objects: clone(seed.objects || []),
      notes: seed.notes || '',
      createdAt: seed.createdAt || nowIso(),
      updatedAt: seed.updatedAt || nowIso(),
      source: seed.source || 'coach-whiteboard',
    };
  }
  function defaultTitle(seed = {}) {
    if (seed.drill?.name || seed.drillName) return `${seed.drill?.name || seed.drillName} — annotation`;
    const plan = currentPractice();
    if (plan?.title) return `${plan.title} — whiteboard`;
    return `Whiteboard ${new Date().toLocaleDateString()}`;
  }
  function rinkFromDrill(drill) {
    const rink = drill?.diagram?.rink || drill?.rink;
    if (!rink) return null;
    if (/full/i.test(rink)) return 'full';
    if (/quarter/i.test(rink)) return 'half';
    return 'half';
  }
  function backgroundFromSeed(seed = {}) {
    if (seed.background) return seed.background;
    const drill = seed.drill || (seed.drillId ? findDrill(seed.drillId) : null);
    if (!drill?.diagram) return null;
    return {
      type: 'drill-freeze-frame',
      drillId: drill.id,
      drillName: drill.name,
      stepIndex: Number.isFinite(Number(seed.freezeStep)) ? Number(seed.freezeStep) : null,
      diagram: normalizeDiagram(drill.diagram),
    };
  }

  function normalizeDiagram(diagram) {
    const d = clone(diagram || {});
    d.rink = d.rink || 'half_ice';
    d.objects = Array.isArray(d.objects) ? d.objects : [];
    d.arrows = Array.isArray(d.arrows) ? d.arrows : [];
    d.sequence = Array.isArray(d.sequence) ? d.sequence : [];
    return d;
  }

  function renderWhiteboardApp(mountOrId, options = {}) {
    const mount = typeof mountOrId === 'string' ? document.getElementById(mountOrId) : mountOrId;
    if (!mount) return null;
    const seed = options.seed || readActiveSeed() || parseQuerySeed() || {};
    const sketch = seed.sketchId ? getSketches().find(s => s.id === seed.sketchId) || createSketch(seed) : createSketch(seed);
    mount.innerHTML = renderShell(options);
    board = createBoardController(mount, sketch, options);
    board.renderAll();
    track('whiteboard_opened', { standalone: Boolean(options.standalone), drillId: sketch.drillId || null, rink: sketch.rink });
    return board;
  }

  function parseQuerySeed() {
    const params = new URLSearchParams(location.search || '');
    const drillId = params.get('drillId');
    const sketchId = params.get('sketchId');
    const step = params.get('step');
    const source = params.get('source') || params.get('from') || '';
    if (!drillId && !sketchId) return null;
    const drill = drillId ? findDrill(drillId) : null;
    return { drill, drillId, sketchId, freezeStep: step ? Number(step) : null, source };
  }

  function renderShell(options = {}) {
    const standalone = Boolean(options.standalone);
    return `
      <section class="wb-shell ${standalone ? 'standalone' : ''}" data-whiteboard-shell>
        <div class="wb-hero">
          <div>
            <div class="wb-kicker">Coach Board · tablet/Pencil-ready</div>
            <h2>Whiteboard</h2>
            <p>Draw over a full or half rink, freeze-frame drills, save sketches to practices, and export images/PDFs from the tablet PWA.</p>
          </div>
          <div class="wb-status"><strong>Offline-ready</strong><span>Sketches save on this device and in app state when available.</span></div>
        </div>
        <div class="wb-workspace">
          <aside class="wb-toolbar" aria-label="Whiteboard tools">
            <div class="wb-tool-row two">
              <button class="wb-tool active" data-wb-tool="pen" type="button">Draw</button>
              <button class="wb-tool" data-wb-tool="arrow" type="button">Arrow</button>
              <button class="wb-tool" data-wb-tool="move" type="button">Move</button>
              <button class="wb-tool" data-wb-tool="erase" type="button">Erase</button>
            </div>
            <div class="wb-tool-row four">
              <button class="wb-tool" data-wb-tool="player" data-wb-player="F" type="button">F</button>
              <button class="wb-tool" data-wb-tool="player" data-wb-player="D" type="button">D</button>
              <button class="wb-tool" data-wb-tool="opponent" data-wb-player="X" type="button">X</button>
              <button class="wb-tool" data-wb-tool="goalie" data-wb-player="G" type="button">G</button>
              <button class="wb-tool" data-wb-tool="puck" type="button">Puck</button>
              <button class="wb-tool" data-wb-tool="cone" type="button">Cone</button>
              <button class="wb-tool" data-wb-tool="text" type="button">Text</button>
              <button class="wb-tool" data-wb-tool="delete" type="button">Delete</button>
            </div>
            <div class="wb-field-grid">
              <label>Rink<select data-wb-rink><option value="full">Full rink</option><option value="half">Half rink</option></select></label>
              <label>Color<input data-wb-color type="color" value="#0a1830"></label>
              <label>Line<input data-wb-width type="range" min="2" max="14" value="5"></label>
              <label>Label<input data-wb-label type="text" value="F" maxlength="3"></label>
            </div>
            <div class="wb-tool-row two">
              <button class="wb-action" data-wb-action="undo" type="button">Undo</button>
              <button class="wb-action" data-wb-action="redo" type="button">Redo</button>
              <button class="wb-action" data-wb-action="clear" type="button">Clear Ink</button>
              <button class="wb-action" data-wb-action="duplicate" type="button">Duplicate</button>
            </div>
            <div class="wb-tool-row two">
              <button class="wb-action primary" data-wb-action="save" type="button">Save Sketch</button>
              <button class="wb-action" data-wb-action="attach" type="button">Attach</button>
              <button class="wb-action" data-wb-action="export-image" type="button">Image</button>
              <button class="wb-action" data-wb-action="export-pdf" type="button">PDF</button>
            </div>
            <label class="wb-title-field">Sketch Title<input data-wb-title type="text" placeholder="Whiteboard title"></label>
            <label class="wb-notes-field">Notes<textarea data-wb-notes placeholder="Coach notes, teaching points, lineup notes..."></textarea></label>
            <div class="wb-meta" data-wb-meta></div>
          </aside>
          <main class="wb-stage-wrap">
            <div class="wb-stage-head">
              <div><strong data-wb-stage-title>Whiteboard</strong><span data-wb-stage-sub>Full rink view</span></div>
              <div class="wb-stage-actions">
                <button class="wb-mini" data-wb-action="freeze-current" type="button">Freeze Current Drill</button>
                <button class="wb-mini" data-wb-action="load-sketches" type="button">Saved Sketches</button>
              </div>
            </div>
            <div class="wb-canvas-shell">
              <canvas data-wb-canvas aria-label="Coach whiteboard canvas"></canvas>
            </div>
            <div class="wb-saved" data-wb-saved hidden></div>
          </main>
        </div>
      </section>`;
  }

  function createBoardController(root, initialSketch, options = {}) {
    const shell = root.querySelector('[data-whiteboard-shell]');
    const canvas = root.querySelector('[data-wb-canvas]');
    const ctx = canvas.getContext('2d');
    const toolbar = root.querySelector('.wb-toolbar');
    const rinkSelect = root.querySelector('[data-wb-rink]');
    const titleInput = root.querySelector('[data-wb-title]');
    const notesInput = root.querySelector('[data-wb-notes]');
    const colorInput = root.querySelector('[data-wb-color]');
    const widthInput = root.querySelector('[data-wb-width]');
    const labelInput = root.querySelector('[data-wb-label]');
    const meta = root.querySelector('[data-wb-meta]');
    const stageTitle = root.querySelector('[data-wb-stage-title]');
    const stageSub = root.querySelector('[data-wb-stage-sub]');
    const savedPanel = root.querySelector('[data-wb-saved]');

    const controller = {
      root, canvas, ctx,
      sketch: createSketch(initialSketch || {}),
      tool: 'pen',
      color: '#0a1830',
      lineWidth: 5,
      objectLabel: 'F',
      dragging: null,
      activeStroke: null,
      arrowDraft: null,
      history: [],
      redoStack: [],
      renderAll,
      saveSketch,
      duplicateSketch,
      exportImage,
      exportPdf,
      attachToPractice,
      loadSketch,
      setBackgroundFromDrill,
    };

    rinkSelect.value = controller.sketch.rink || 'full';
    titleInput.value = controller.sketch.title || '';
    notesInput.value = controller.sketch.notes || '';
    colorInput.value = controller.color;
    widthInput.value = String(controller.lineWidth);
    labelInput.value = controller.objectLabel;

    canvas.style.touchAction = 'none';
    setupCanvasSize(controller);
    pushHistory(controller, true);

    toolbar.addEventListener('click', (event) => {
      const toolButton = event.target.closest('[data-wb-tool]');
      if (toolButton) {
        controller.tool = toolButton.dataset.wbTool || 'pen';
        const label = toolButton.dataset.wbPlayer;
        if (label) { controller.objectLabel = label; labelInput.value = label; }
        root.querySelectorAll('[data-wb-tool]').forEach(btn => btn.classList.toggle('active', btn === toolButton));
        return;
      }
      const action = event.target.closest('[data-wb-action]')?.dataset.wbAction;
      if (action) handleAction(controller, action);
    });

    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-wb-action]')?.dataset.wbAction;
      if (action && !event.target.closest('.wb-toolbar')) handleAction(controller, action);
      const sketchButton = event.target.closest('[data-wb-load-sketch]');
      if (sketchButton) controller.loadSketch(sketchButton.dataset.wbLoadSketch);
    });

    rinkSelect.addEventListener('change', () => { controller.sketch.rink = rinkSelect.value; markChanged(controller); renderAll(); });
    titleInput.addEventListener('input', () => { controller.sketch.title = titleInput.value; controller.sketch.updatedAt = nowIso(); updateMeta(controller); });
    notesInput.addEventListener('input', () => { controller.sketch.notes = notesInput.value; controller.sketch.updatedAt = nowIso(); });
    colorInput.addEventListener('input', () => { controller.color = colorInput.value; });
    widthInput.addEventListener('input', () => { controller.lineWidth = Number(widthInput.value || 5); });
    labelInput.addEventListener('input', () => { controller.objectLabel = labelInput.value || 'F'; });

    canvas.addEventListener('pointerdown', (event) => onPointerDown(controller, event));
    canvas.addEventListener('pointermove', (event) => onPointerMove(controller, event));
    canvas.addEventListener('pointerup', (event) => onPointerUp(controller, event));
    canvas.addEventListener('pointercancel', (event) => onPointerUp(controller, event));
    canvas.addEventListener('lostpointercapture', (event) => onPointerUp(controller, event));
    window.addEventListener('resize', () => { setupCanvasSize(controller); renderAll(); });

    function renderAll() {
      setupCanvasSize(controller);
      drawBoard(controller);
      if (stageTitle) stageTitle.textContent = controller.sketch.title || 'Whiteboard';
      if (stageSub) {
        const drill = controller.sketch.drillName ? ` · ${controller.sketch.drillName}` : '';
        const step = controller.sketch.freezeStep !== null && controller.sketch.freezeStep !== undefined ? ` · step ${Number(controller.sketch.freezeStep) + 1}` : '';
        stageSub.textContent = `${controller.sketch.rink === 'half' ? 'Half rink' : 'Full rink'}${drill}${step}`;
      }
      if (titleInput.value !== controller.sketch.title) titleInput.value = controller.sketch.title || '';
      if (notesInput.value !== controller.sketch.notes) notesInput.value = controller.sketch.notes || '';
      if (rinkSelect.value !== controller.sketch.rink) rinkSelect.value = controller.sketch.rink || 'full';
      updateMeta(controller);
    }

    function saveSketch() { return saveSketchImpl(controller); }
    function duplicateSketch() { return duplicateSketchImpl(controller); }
    function exportImage() { return exportImageImpl(controller); }
    function exportPdf() { return exportPdfImpl(controller); }
    function attachToPractice() { return attachToPracticeImpl(controller); }
    function loadSketch(id) { return loadSketchImpl(controller, id); }
    function setBackgroundFromDrill(drill, opts = {}) { return setBackgroundFromDrillImpl(controller, drill, opts); }

    return controller;
  }

  function setupCanvasSize(controller) {
    const dpr = window.devicePixelRatio || 1;
    const w = BOARD_W;
    const h = BOARD_H;
    if (controller.canvas.width !== w * dpr || controller.canvas.height !== h * dpr) {
      controller.canvas.width = w * dpr;
      controller.canvas.height = h * dpr;
      controller.canvas.style.aspectRatio = `${w} / ${h}`;
      controller.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      controller.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function toBoardPoint(controller, event) {
    const rect = controller.canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * (BOARD_W / rect.width), 0, BOARD_W),
      y: clamp((event.clientY - rect.top) * (BOARD_H / rect.height), 0, BOARD_H),
      pressure: event.pressure && event.pressure > 0 ? event.pressure : 0.45,
      pointerType: event.pointerType || 'mouse',
    };
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function onPointerDown(controller, event) {
    event.preventDefault();
    controller.canvas.setPointerCapture?.(event.pointerId);
    const pt = toBoardPoint(controller, event);
    const tool = controller.tool;
    if (tool === 'pen') {
      controller.activeStroke = { id: uid('stroke'), tool: 'pen', color: controller.color, width: controller.lineWidth, points: [pt], pointerType: pt.pointerType, createdAt: nowIso() };
      controller.sketch.strokes.push(controller.activeStroke);
      renderPreview(controller);
      return;
    }
    if (tool === 'arrow') {
      controller.arrowDraft = { id: uid('arrow'), from: pt, to: pt, color: controller.color, width: controller.lineWidth, createdAt: nowIso() };
      renderPreview(controller);
      return;
    }
    if (tool === 'erase' || tool === 'delete') {
      deleteHit(controller, pt);
      return;
    }
    if (tool === 'move') {
      const hit = hitObject(controller, pt);
      if (hit) controller.dragging = { item: hit, dx: pt.x - hit.x, dy: pt.y - hit.y };
      return;
    }
    if (tool === 'player' || tool === 'opponent' || tool === 'goalie' || tool === 'puck' || tool === 'cone' || tool === 'text') {
      const item = createObjectFromTool(controller, tool, pt);
      controller.sketch.objects.push(item);
      markChanged(controller);
      pushHistory(controller);
      renderAllIf(controller);
      return;
    }
  }

  function onPointerMove(controller, event) {
    if (!controller.activeStroke && !controller.arrowDraft && !controller.dragging) return;
    event.preventDefault();
    const pt = toBoardPoint(controller, event);
    if (controller.activeStroke) {
      const last = controller.activeStroke.points[controller.activeStroke.points.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 2) controller.activeStroke.points.push(pt);
      renderPreview(controller);
    }
    if (controller.arrowDraft) {
      controller.arrowDraft.to = pt;
      renderPreview(controller);
    }
    if (controller.dragging?.item) {
      controller.dragging.item.x = clamp(pt.x - controller.dragging.dx, 20, BOARD_W - 20);
      controller.dragging.item.y = clamp(pt.y - controller.dragging.dy, 20, BOARD_H - 20);
      renderPreview(controller);
    }
  }

  function onPointerUp(controller, event) {
    if (controller.activeStroke) {
      if (controller.activeStroke.points.length < 2) controller.sketch.strokes = controller.sketch.strokes.filter(s => s.id !== controller.activeStroke.id);
      controller.activeStroke = null;
      markChanged(controller);
      pushHistory(controller);
    }
    if (controller.arrowDraft) {
      if (Math.hypot(controller.arrowDraft.to.x - controller.arrowDraft.from.x, controller.arrowDraft.to.y - controller.arrowDraft.from.y) > 12) {
        controller.sketch.arrows.push(controller.arrowDraft);
      }
      controller.arrowDraft = null;
      markChanged(controller);
      pushHistory(controller);
    }
    if (controller.dragging) {
      controller.dragging = null;
      markChanged(controller);
      pushHistory(controller);
    }
    renderAllIf(controller);
  }

  function createObjectFromTool(controller, tool, pt) {
    const label = (tool === 'puck' || tool === 'cone') ? '' : (controller.objectLabel || (tool === 'goalie' ? 'G' : tool === 'opponent' ? 'X' : 'F'));
    return { id: uid('obj'), type: tool, label, x: pt.x, y: pt.y, color: controller.color, createdAt: nowIso() };
  }
  function hitObject(controller, pt) {
    for (let i = controller.sketch.objects.length - 1; i >= 0; i -= 1) {
      const obj = controller.sketch.objects[i];
      const radius = obj.type === 'cone' ? 26 : obj.type === 'puck' ? 18 : 24;
      if (Math.hypot(obj.x - pt.x, obj.y - pt.y) <= radius) return obj;
    }
    return null;
  }
  function deleteHit(controller, pt) {
    const obj = hitObject(controller, pt);
    if (obj) {
      controller.sketch.objects = controller.sketch.objects.filter(o => o.id !== obj.id);
      markChanged(controller); pushHistory(controller); renderAllIf(controller); return;
    }
    const arrow = controller.sketch.arrows.find(a => distanceToSegment(pt, a.from, a.to) < 18);
    if (arrow) {
      controller.sketch.arrows = controller.sketch.arrows.filter(a => a.id !== arrow.id);
      markChanged(controller); pushHistory(controller); renderAllIf(controller); return;
    }
    const stroke = controller.sketch.strokes.find(s => (s.points || []).some((p, idx) => idx > 0 && distanceToSegment(pt, s.points[idx - 1], p) < Math.max(14, s.width + 8)));
    if (stroke) {
      controller.sketch.strokes = controller.sketch.strokes.filter(s => s.id !== stroke.id);
      markChanged(controller); pushHistory(controller); renderAllIf(controller);
    }
  }
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function markChanged(controller) {
    controller.sketch.updatedAt = nowIso();
  }
  function stateSnapshot(controller) {
    return clone({ strokes: controller.sketch.strokes, arrows: controller.sketch.arrows, objects: controller.sketch.objects, rink: controller.sketch.rink, background: controller.sketch.background });
  }
  function applySnapshot(controller, snap) {
    controller.sketch.strokes = clone(snap.strokes || []);
    controller.sketch.arrows = clone(snap.arrows || []);
    controller.sketch.objects = clone(snap.objects || []);
    controller.sketch.rink = snap.rink || controller.sketch.rink || 'full';
    controller.sketch.background = clone(snap.background || null);
    markChanged(controller);
  }
  function pushHistory(controller, initial = false) {
    const snap = stateSnapshot(controller);
    const last = controller.history[controller.history.length - 1];
    if (!initial && JSON.stringify(last) === JSON.stringify(snap)) return;
    controller.history.push(snap);
    if (controller.history.length > 80) controller.history.shift();
    if (!initial) controller.redoStack = [];
  }
  function undo(controller) {
    if (controller.history.length <= 1) return;
    const current = controller.history.pop();
    controller.redoStack.push(current);
    applySnapshot(controller, controller.history[controller.history.length - 1]);
    renderAllIf(controller);
  }
  function redo(controller) {
    const snap = controller.redoStack.pop();
    if (!snap) return;
    applySnapshot(controller, snap);
    controller.history.push(stateSnapshot(controller));
    renderAllIf(controller);
  }
  function clearInk(controller) {
    if (!confirm('Clear drawings and objects from this sketch? The rink/drill background stays.')) return;
    controller.sketch.strokes = [];
    controller.sketch.arrows = [];
    controller.sketch.objects = [];
    markChanged(controller); pushHistory(controller); renderAllIf(controller);
  }

  function handleAction(controller, action) {
    if (action === 'undo') return undo(controller);
    if (action === 'redo') return redo(controller);
    if (action === 'clear') return clearInk(controller);
    if (action === 'save') return controller.saveSketch();
    if (action === 'duplicate') return controller.duplicateSketch();
    if (action === 'export-image') return controller.exportImage();
    if (action === 'export-pdf') return controller.exportPdf();
    if (action === 'attach') return controller.attachToPractice();
    if (action === 'load-sketches') return renderSavedSketches(controller);
    if (action === 'freeze-current') return freezeCurrentDrill(controller);
  }

  function renderAllIf(controller) { controller.renderAll?.(); }
  function renderPreview(controller) { drawBoard(controller, { preview: true }); }

  function drawBoard(controller) {
    const ctx = controller.ctx;
    ctx.save();
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    drawRink(ctx, controller.sketch.rink || 'full');
    if (controller.sketch.background) drawBackground(ctx, controller.sketch.background, controller.sketch.rink || 'full');
    for (const stroke of controller.sketch.strokes || []) drawStroke(ctx, stroke);
    for (const arrow of controller.sketch.arrows || []) drawFreeArrow(ctx, arrow);
    if (controller.arrowDraft) drawFreeArrow(ctx, { ...controller.arrowDraft, draft: true });
    for (const obj of controller.sketch.objects || []) drawBoardObject(ctx, obj);
    ctx.restore();
  }

  function drawRink(ctx, rink = 'full') {
    const pad = 34;
    roundedRect(ctx, pad, pad, BOARD_W - pad * 2, BOARD_H - pad * 2, 86);
    ctx.fillStyle = COLORS.ice;
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, pad, pad, BOARD_W - pad * 2, BOARD_H - pad * 2, 86);
    ctx.clip();
    ctx.fillStyle = 'rgba(36,104,201,.035)';
    for (let x = pad; x < BOARD_W - pad; x += 48) {
      ctx.fillRect(x, pad, 1, BOARD_H - pad * 2);
    }
    if (rink === 'half') drawHalfRink(ctx, pad); else drawFullRink(ctx, pad);
    ctx.restore();
  }
  function drawFullRink(ctx, pad) {
    const midX = BOARD_W / 2;
    const top = pad;
    const bottom = BOARD_H - pad;
    const left = pad;
    const right = BOARD_W - pad;
    const blueA = BOARD_W * 0.36;
    const blueB = BOARD_W * 0.64;
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 5;
    line(ctx, midX, top, midX, bottom);
    ctx.setLineDash([12, 9]); line(ctx, left + 80, BOARD_H / 2, right - 80, BOARD_H / 2); ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 8;
    line(ctx, blueA, top, blueA, bottom);
    line(ctx, blueB, top, blueB, bottom);
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 4;
    line(ctx, left + 82, top, left + 82, bottom);
    line(ctx, right - 82, top, right - 82, bottom);
    drawNet(ctx, left + 82, BOARD_H / 2, 'left');
    drawNet(ctx, right - 82, BOARD_H / 2, 'right');
    drawCrease(ctx, left + 82, BOARD_H / 2, 'left');
    drawCrease(ctx, right - 82, BOARD_H / 2, 'right');
    faceoff(ctx, midX, BOARD_H / 2, 62, COLORS.blue);
    [[left + 210, top + 150], [left + 210, bottom - 150], [right - 210, top + 150], [right - 210, bottom - 150]].forEach(([x, y]) => faceoff(ctx, x, y, 54, COLORS.red));
    [[midX - 155, top + 155], [midX - 155, bottom - 155], [midX + 155, top + 155], [midX + 155, bottom - 155]].forEach(([x, y]) => dot(ctx, x, y, 7, COLORS.red));
  }
  function drawHalfRink(ctx, pad) {
    const left = pad;
    const right = BOARD_W - pad;
    const top = pad;
    const bottom = BOARD_H - pad;
    const goalX = left + 110;
    const blueX = BOARD_W * 0.66;
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 5;
    line(ctx, goalX, top, goalX, bottom);
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 8;
    line(ctx, blueX, top, blueX, bottom);
    drawNet(ctx, goalX, BOARD_H / 2, 'left');
    drawCrease(ctx, goalX, BOARD_H / 2, 'left');
    [[left + 265, top + 160], [left + 265, bottom - 160]].forEach(([x, y]) => faceoff(ctx, x, y, 62, COLORS.red));
    [[blueX + 145, top + 160], [blueX + 145, bottom - 160]].forEach(([x, y]) => dot(ctx, x, y, 7, COLORS.red));
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 4; ctx.setLineDash([16, 12]);
    line(ctx, right - 80, top, right - 80, bottom);
    ctx.setLineDash([]);
  }
  function drawNet(ctx, x, y, side) {
    ctx.save();
    ctx.fillStyle = COLORS.red;
    if (side === 'left') ctx.fillRect(x - 34, y - 34, 34, 68);
    else ctx.fillRect(x, y - 34, 34, 68);
    ctx.restore();
  }
  function drawCrease(ctx, x, y, side) {
    ctx.save();
    ctx.fillStyle = COLORS.crease; ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 3;
    ctx.beginPath();
    if (side === 'left') ctx.arc(x, y, 62, -Math.PI / 2, Math.PI / 2, false);
    else ctx.arc(x, y, 62, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function faceoff(ctx, x, y, r, color) { dot(ctx, x, y, 7, color); ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  function dot(ctx, x, y, r, color) { ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function roundedRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawBackground(ctx, background, rink) {
    if (background.type !== 'drill-freeze-frame' || !background.diagram) return;
    ctx.save();
    ctx.globalAlpha = 0.82;
    const diagram = normalizeDiagram(background.diagram);
    const mapping = diagramMapping(diagram, rink);
    const stepIndex = background.stepIndex;
    const arrowsToDraw = arrowsForStep(diagram, stepIndex);
    for (const arrow of arrowsToDraw) drawDiagramArrow(ctx, arrow, diagram.objects, mapping, stepIndex !== null);
    for (const obj of diagram.objects) drawDiagramObject(ctx, obj, mapping, isFocused(diagram, stepIndex, obj.id));
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(5, 12, 18, .72)';
    ctx.fillRect(44, 44, 420, 38);
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(background.drillName || 'Drill annotation', 62, 69);
    ctx.restore();
  }
  function arrowsForStep(diagram, stepIndex) {
    if (stepIndex === null || stepIndex === undefined || !diagram.sequence?.length) return diagram.arrows;
    const step = diagram.sequence[Math.max(0, Math.min(stepIndex, diagram.sequence.length - 1))];
    if (Array.isArray(step.arrowIndexes) && step.arrowIndexes.length) return step.arrowIndexes.map(i => diagram.arrows[i]).filter(Boolean);
    return diagram.arrows.slice(0, stepIndex + 1);
  }
  function isFocused(diagram, stepIndex, id) {
    if (stepIndex === null || stepIndex === undefined || !diagram.sequence?.length) return false;
    return (diagram.sequence[stepIndex]?.focusIds || []).includes(id);
  }
  function diagramMapping(diagram, rink) {
    const sourceW = DRILL_W;
    const sourceH = DRILL_H;
    const target = rink === 'half' ? { x: 95, y: 80, w: 1010, h: 560 } : { x: 285, y: 72, w: 630, h: 580 };
    const scale = Math.min(target.w / sourceW, target.h / sourceH);
    const w = sourceW * scale;
    const h = sourceH * scale;
    return { x: target.x + (target.w - w) / 2, y: target.y + (target.h - h) / 2, scale };
  }
  function mapPoint(p, m) { return { x: m.x + p.x * m.scale, y: m.y + p.y * m.scale }; }
  function drawDiagramObject(ctx, obj, m, focused) {
    const p = mapPoint(obj, m);
    const type = obj.type || 'player';
    const fill = type === 'defense' ? COLORS.defense : type === 'defender' ? COLORS.opponent : type === 'cone' ? COLORS.cone : type === 'puck' ? COLORS.puck : COLORS.forward;
    ctx.save();
    if (focused) { ctx.strokeStyle = '#f4cf57'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2); ctx.stroke(); }
    if (type === 'cone') drawCone(ctx, p.x, p.y, 16);
    else if (type === 'puck') { ctx.fillStyle = COLORS.puck; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = fill; ctx.strokeStyle = '#061015'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (obj.label) { ctx.fillStyle = '#fff'; ctx.font = '800 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label, p.x, p.y); } }
    ctx.restore();
  }
  function drawDiagramArrow(ctx, arrow, objects, m, highlighted) {
    const from = objects.find(o => o.id === arrow.from);
    const to = objects.find(o => o.id === arrow.to);
    if (!from || !to) return;
    const a = mapPoint(from, m);
    const b = mapPoint(to, m);
    drawArrowPath(ctx, a, b, { color: highlighted ? '#f4cf57' : COLORS.ink, width: highlighted ? 5 : 3, dashed: arrow.dashed, curve: arrow.style === 'curve' || arrow.style === 'loop' });
  }

  function drawStroke(ctx, stroke) {
    const points = stroke.points || [];
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color || COLORS.ink;
    ctx.lineWidth = stroke.width || 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.restore();
  }
  function drawFreeArrow(ctx, arrow) {
    drawArrowPath(ctx, arrow.from, arrow.to, { color: arrow.color || COLORS.ink, width: arrow.width || 5, dashed: arrow.draft, curve: true });
  }
  function drawArrowPath(ctx, from, to, opts = {}) {
    ctx.save();
    ctx.strokeStyle = opts.color || COLORS.ink;
    ctx.fillStyle = opts.color || COLORS.ink;
    ctx.lineWidth = opts.width || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (opts.dashed) ctx.setLineDash([14, 10]);
    let end = to;
    if (opts.curve) {
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(90, len * .22);
      const c = { x: mid.x - dy / len * bend, y: mid.y + dx / len * bend };
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(c.x, c.y, to.x, to.y); ctx.stroke();
      drawArrowHead(ctx, c, to, opts.width || 4);
    } else {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); drawArrowHead(ctx, from, end, opts.width || 4);
    }
    ctx.restore();
  }
  function drawArrowHead(ctx, from, to, width) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = Math.max(14, width * 3.2);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 7), to.y - size * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7), to.y - size * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }
  function drawBoardObject(ctx, obj) {
    ctx.save();
    if (obj.type === 'cone') drawCone(ctx, obj.x, obj.y, 24);
    else if (obj.type === 'puck') { ctx.fillStyle = COLORS.puck; ctx.beginPath(); ctx.arc(obj.x, obj.y, 11, 0, Math.PI * 2); ctx.fill(); }
    else if (obj.type === 'text') { ctx.fillStyle = obj.color || COLORS.ink; ctx.font = '900 30px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label || 'Text', obj.x, obj.y); }
    else {
      const fill = obj.type === 'defense' || obj.label === 'D' ? COLORS.defense : obj.type === 'opponent' || obj.label === 'X' ? COLORS.opponent : obj.type === 'goalie' || obj.label === 'G' ? '#4ad9a8' : COLORS.forward;
      ctx.fillStyle = fill; ctx.strokeStyle = '#061015'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = obj.label === 'X' ? '#1a1200' : '#fff'; ctx.font = '900 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label || 'F', obj.x, obj.y);
    }
    ctx.restore();
  }
  function drawCone(ctx, x, y, size) {
    ctx.save(); ctx.fillStyle = COLORS.cone; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function saveSketchImpl(controller) {
    controller.sketch.title = controller.root.querySelector('[data-wb-title]')?.value || controller.sketch.title || 'Whiteboard';
    controller.sketch.notes = controller.root.querySelector('[data-wb-notes]')?.value || '';
    controller.sketch.updatedAt = nowIso();
    const sketches = getSketches().filter(s => s.id !== controller.sketch.id);
    sketches.unshift(clone(controller.sketch));
    setSketches(sketches);
    const appState = getGlobalState();
    if (appState) { ensureWhiteboardState(appState).recentSketchId = controller.sketch.id; saveGlobalState(); }
    track('whiteboard_sketch_saved', { drillId: controller.sketch.drillId || null, practiceId: controller.sketch.practiceId || null, objects: controller.sketch.objects.length, strokes: controller.sketch.strokes.length });
    toast('Whiteboard sketch saved');
    updateMeta(controller);
    return controller.sketch;
  }
  function duplicateSketchImpl(controller) {
    const copy = createSketch({ ...clone(controller.sketch), id: uid('sketch'), title: `${controller.sketch.title || 'Whiteboard'} copy`, createdAt: nowIso(), updatedAt: nowIso() });
    copy.strokes = clone(controller.sketch.strokes); copy.arrows = clone(controller.sketch.arrows); copy.objects = clone(controller.sketch.objects);
    controller.sketch = copy;
    controller.history = []; controller.redoStack = [];
    pushHistory(controller, true);
    controller.renderAll();
    saveSketchImpl(controller);
    toast('Sketch duplicated');
  }
  function attachToPracticeImpl(controller) {
    const sketch = saveSketchImpl(controller);
    const appState = getGlobalState();
    const plan = currentPractice(appState);
    if (!appState || !plan) { toast('Saved locally. Open from the full app to attach to a practice.'); return; }
    appState.currentPlan.whiteboardSketchIds = Array.from(new Set([...(appState.currentPlan.whiteboardSketchIds || []), sketch.id]));
    appState.currentPlan.updatedAt = nowIso();
    saveGlobalState();
    toast('Attached sketch to current practice');
    track('whiteboard_sketch_attached', { sketchId: sketch.id, practiceId: plan.id || null });
  }
  function exportCanvasDataUrl(controller) {
    drawBoard(controller);
    return controller.canvas.toDataURL('image/png');
  }
  function exportImageImpl(controller) {
    const url = exportCanvasDataUrl(controller);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFile(controller.sketch.title || 'benchboss-whiteboard')}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    track('whiteboard_exported', { format: 'png', drillId: controller.sketch.drillId || null });
  }
  async function exportPdfImpl(controller) {
    const url = exportCanvasDataUrl(controller);
    try {
      const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(controller.sketch.title || 'BenchBoss Whiteboard', 36, 34);
      doc.addImage(url, 'PNG', 36, 52, 720, 432);
      const notes = (controller.sketch.notes || '').slice(0, 500);
      if (notes) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(notes, 36, 512, { maxWidth: 720 }); }
      doc.save(`${safeFile(controller.sketch.title || 'benchboss-whiteboard')}.pdf`);
      track('whiteboard_exported', { format: 'pdf', drillId: controller.sketch.drillId || null });
    } catch (error) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<title>${esc(controller.sketch.title || 'Whiteboard')}</title><body style="margin:0;font-family:sans-serif"><img src="${url}" style="width:100%;display:block"><script>setTimeout(()=>print(),250)<\/script></body>`);
        win.document.close();
      } else {
        exportImageImpl(controller);
      }
    }
  }
  function safeFile(value) { return String(value || 'whiteboard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'whiteboard'; }
  function loadSketchImpl(controller, id) {
    const sketch = getSketches().find(s => s.id === id);
    if (!sketch) return;
    controller.sketch = createSketch(sketch);
    controller.history = []; controller.redoStack = []; pushHistory(controller, true);
    controller.renderAll();
    toast('Sketch loaded');
  }
  function renderSavedSketches(controller) {
    const panel = controller.root.querySelector('[data-wb-saved]');
    if (!panel) return;
    const sketches = getSketches();
    panel.hidden = !panel.hidden && panel.dataset.open === 'true';
    panel.dataset.open = panel.hidden ? 'false' : 'true';
    if (panel.hidden) return;
    panel.innerHTML = `<div class="wb-saved-head"><strong>Saved Sketches</strong><span>${sketches.length}</span></div>${sketches.length ? sketches.map(s => `<button type="button" data-wb-load-sketch="${esc(s.id)}"><strong>${esc(s.title || 'Whiteboard')}</strong><span>${esc(s.drillName || s.practiceTitle || new Date(s.updatedAt || s.createdAt).toLocaleString())}</span></button>`).join('') : '<p>No sketches saved yet.</p>'}`;
  }
  function freezeCurrentDrill(controller) {
    const appState = getGlobalState();
    const block = currentBlock(appState);
    const drill = findDrill(block?.drillId || block?.id, appState) || allDrills(appState)[0];
    if (!drill) { toast('No current drill found to annotate'); return; }
    setBackgroundFromDrillImpl(controller, drill, { freezeStep: 0, source: 'current-practice' });
  }
  function setBackgroundFromDrillImpl(controller, drill, opts = {}) {
    if (!drill?.diagram) { toast('This drill has no diagram to freeze.'); return; }
    controller.sketch.drillId = drill.id;
    controller.sketch.drillName = drill.name;
    controller.sketch.freezeStep = Number.isFinite(Number(opts.freezeStep)) ? Number(opts.freezeStep) : 0;
    controller.sketch.rink = rinkFromDrill(drill) || 'half';
    controller.sketch.background = backgroundFromSeed({ drill, freezeStep: controller.sketch.freezeStep });
    controller.sketch.title = `${drill.name} — freeze frame`;
    markChanged(controller); pushHistory(controller); controller.renderAll();
    toast('Drill freeze frame loaded');
    track('whiteboard_freeze_frame_loaded', { drillId: drill.id, step: controller.sketch.freezeStep, source: opts.source || '' });
  }
  function updateMeta(controller) {
    const meta = controller.root.querySelector('[data-wb-meta]');
    if (!meta) return;
    const sketch = controller.sketch;
    meta.innerHTML = `
      <div><strong>${esc(sketch.drillName || 'Open board')}</strong><span>${esc(sketch.practiceTitle || 'No practice attached')}</span></div>
      <div><strong>${sketch.strokes.length}</strong><span>strokes</span></div>
      <div><strong>${sketch.objects.length}</strong><span>objects</span></div>
    `;
  }

  function openWhiteboard(seed = {}) {
    writeActiveSeed(seed);
    if (document.getElementById('page-whiteboard')) {
      if (typeof window.navTo === 'function') window.navTo('whiteboard');
      else renderWhiteboardApp('whiteboardMount', { seed });
      return;
    }
    const url = new URL('./whiteboard.html', location.href);
    if (seed.drill?.id || seed.drillId) url.searchParams.set('drillId', seed.drill?.id || seed.drillId);
    if (Number.isFinite(Number(seed.freezeStep))) url.searchParams.set('step', String(Number(seed.freezeStep)));
    if (seed.sketchId) url.searchParams.set('sketchId', seed.sketchId);
    if (seed.source) url.searchParams.set('source', seed.source);
    window.location.href = url.toString();
  }
  function openFromDrill(drillOrId, opts = {}) {
    const drill = typeof drillOrId === 'string' ? findDrill(drillOrId) : drillOrId;
    if (!drill) { toast('Drill not found'); return; }
    openWhiteboard({ drill, drillId: drill.id, freezeStep: Number.isFinite(Number(opts.freezeStep)) ? Number(opts.freezeStep) : 0, source: opts.source || 'drill' });
  }
  function openFromCurrentDrill(appState = getGlobalState()) {
    const block = currentBlock(appState);
    const drill = findDrill(block?.drillId || block?.id, appState);
    if (drill) openFromDrill(drill, { freezeStep: 0, source: 'current-practice' });
    else openWhiteboard({ source: 'current-practice' });
  }
  function openBlank(opts = {}) { openWhiteboard({ title: opts.title || 'Open whiteboard', rink: opts.rink || 'full', source: opts.source || 'blank' }); }

  function injectStyles() {
    if (document.getElementById('benchbossWhiteboardStyles')) return;
    const style = document.createElement('style');
    style.id = 'benchbossWhiteboardStyles';
    style.textContent = `
      .wb-shell{display:grid;gap:14px}.wb-hero{display:grid;grid-template-columns:1fr;gap:12px;padding:16px;border:1px solid var(--border,#2a2a2a);border-radius:16px;background:linear-gradient(135deg,rgba(125,211,216,.15),rgba(244,207,87,.08))}.wb-kicker{font-size:10px;color:var(--teal,#7dd3d8);letter-spacing:1.6px;text-transform:uppercase;font-weight:900}.wb-hero h2{font-family:'Bebas Neue','Oswald',sans-serif;font-size:42px;letter-spacing:1px;margin:4px 0;line-height:.9}.wb-hero p{margin:0;color:var(--text-mid,#bbb);font-size:12px;line-height:1.5}.wb-status{background:rgba(0,0,0,.26);border:1px solid rgba(125,211,216,.25);border-radius:12px;padding:12px}.wb-status strong{display:block;color:var(--teal,#7dd3d8)}.wb-status span{display:block;color:var(--text-dim,#888);font-size:11px;line-height:1.4;margin-top:4px}.wb-workspace{display:grid;gap:12px}.wb-toolbar{display:grid;gap:10px;background:var(--panel,#141414);border:1px solid var(--border,#2a2a2a);border-radius:16px;padding:12px;align-content:start}.wb-tool-row{display:grid;gap:8px}.wb-tool-row.two{grid-template-columns:repeat(2,1fr)}.wb-tool-row.four{grid-template-columns:repeat(4,1fr)}.wb-tool,.wb-action,.wb-mini{border:1px solid rgba(125,211,216,.35);background:rgba(125,211,216,.08);color:var(--teal,#7dd3d8);border-radius:10px;padding:11px 8px;min-height:42px;font-family:inherit;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}.wb-tool.active,.wb-action.primary{background:var(--teal,#7dd3d8);color:#061015;border-color:var(--teal,#7dd3d8)}.wb-field-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.wb-field-grid label,.wb-title-field,.wb-notes-field{display:grid;gap:5px;color:var(--text-dim,#888);font-size:10px;text-transform:uppercase;letter-spacing:.9px}.wb-field-grid input,.wb-field-grid select,.wb-title-field input,.wb-notes-field textarea{width:100%;background:var(--bg,#0a0a0a);border:1px solid var(--border,#2a2a2a);border-radius:10px;color:var(--text,#e8e8e8);padding:10px;font-size:14px}.wb-field-grid input[type=color]{padding:2px;height:42px}.wb-notes-field textarea{min-height:82px;resize:vertical}.wb-meta{display:grid;grid-template-columns:1fr repeat(2,70px);gap:8px}.wb-meta div{background:rgba(255,255,255,.04);border:1px solid var(--border,#2a2a2a);border-radius:10px;padding:8px;min-width:0}.wb-meta strong{display:block;color:var(--text,#e8e8e8);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wb-meta span{display:block;color:var(--text-dim,#888);font-size:9px;margin-top:3px;text-transform:uppercase}.wb-stage-wrap{background:var(--panel,#141414);border:1px solid var(--border,#2a2a2a);border-radius:16px;padding:12px;min-width:0}.wb-stage-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.wb-stage-head strong{display:block;color:var(--teal,#7dd3d8);font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:1.2px}.wb-stage-head span{display:block;color:var(--text-dim,#888);font-size:10px;margin-top:3px}.wb-stage-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.wb-canvas-shell{background:#0f1720;border:1px solid rgba(125,211,216,.18);border-radius:14px;padding:8px;overflow:hidden}.wb-canvas-shell canvas{display:block;width:100%;height:auto;background:#fff;border-radius:10px;box-shadow:0 14px 50px rgba(0,0,0,.35);touch-action:none;cursor:crosshair}.wb-saved{margin-top:10px;border:1px solid var(--border,#2a2a2a);border-radius:14px;padding:10px;display:grid;gap:8px}.wb-saved-head{display:flex;justify-content:space-between;color:var(--teal,#7dd3d8);font-weight:900;font-size:12px;text-transform:uppercase}.wb-saved button{display:grid;gap:4px;text-align:left;background:rgba(255,255,255,.04);border:1px solid var(--border,#2a2a2a);border-radius:10px;color:var(--text,#e8e8e8);padding:10px}.wb-saved button span{color:var(--text-dim,#888);font-size:10px}@media(min-width:920px){.wb-hero{grid-template-columns:1fr 260px}.wb-workspace{grid-template-columns:minmax(280px,340px) 1fr}.wb-shell.standalone{padding:16px}}@media(max-width:620px){.wb-toolbar{order:2}.wb-stage-wrap{order:1}.wb-tool,.wb-action,.wb-mini{min-height:48px}.wb-stage-head{align-items:flex-start;flex-direction:column}.wb-field-grid{grid-template-columns:1fr 1fr}.wb-meta{grid-template-columns:1fr}.wb-hero h2{font-size:34px}}
    `;
    document.head.appendChild(style);
  }

  // Public API
  const api = {
    VERSION,
    injectStyles,
    renderWhiteboardApp,
    ensureWhiteboardState,
    openWhiteboard,
    openBlank,
    openFromDrill,
    openFromCurrentDrill,
    readSketches: getSketches,
    saveSketches: setSketches,
    get activeBoard() { return board; },
  };

  window.BenchBossWhiteboard = api;
  window.BearDenHQ = { ...(window.BearDenHQ || {}), hydrateWhiteboard: (stateArg) => { ensureWhiteboardState(stateArg || getGlobalState()); injectStyles(); return renderWhiteboardApp('whiteboardMount', { seed: {}, standalone: false }); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyles);
  else injectStyles();
})();
