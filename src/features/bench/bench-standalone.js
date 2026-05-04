// BenchBoss Coach HQ v0.7.0 — Standalone offline Bench Mode.
// This file powers bench.html after a coach preloads a practice from app.html#bench.
(function benchBossStandaloneBenchMode() {
  const OFFLINE_PACK_KEY = 'benchboss_bench_offline_pack_v1';
  const INDEX_KEY = 'benchboss_bench_standalone_index_v1';
  const STEP_KEY = 'benchboss_bench_standalone_step_v1';
  const RECAPS_KEY = 'benchboss_bench_standalone_recaps_v1';
  const BENCH_OPENED_KEY = 'benchboss_bench_standalone_opened_v1';
  let timer = null;
  let remaining = 0;

  function trackEvent(name, properties = {}) {
    const item = {
      name: String(name || 'event').slice(0, 80),
      properties: { ...properties, source: properties.source || 'bench-standalone', ts: new Date().toISOString(), appVersion: '0.10.0' },
    };
    try {
      if (window.BearDenHQ?.trackEvent) return window.BearDenHQ.trackEvent(item.name, item.properties);
      const key = 'benchboss_analytics_offline_queue_v1';
      const queued = JSON.parse(localStorage.getItem(key) || '[]');
      queued.push(item);
      localStorage.setItem(key, JSON.stringify(queued.slice(-250)));
      console.info('Analytics event queued offline', item.name, item.properties);
    } catch {}
  }

  const CATEGORY_LABELS = {
    skating: 'Skating', puck: 'Puck Handling', passing: 'Passing', shooting: 'Shooting', battle: 'Battles',
    breakout: 'Breakouts', dzone: 'D-Zone', ozone: 'O-Zone', pp: 'Power Play', pk: 'Penalty Kill', sag: 'Small Area',
    cond: 'Conditioning', goalie: 'Goalie', transition: 'Transition', compete: 'Compete', warmup: 'Warmup',
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function readPack() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || 'null'); } catch { return null; }
  }
  function writePack(pack) { localStorage.setItem(OFFLINE_PACK_KEY, JSON.stringify(pack)); }
  function blocks(pack) { return Array.isArray(pack?.plan?.blocks) ? pack.plan.blocks : []; }
  function getIndex(pack) { return Math.min(Math.max(0, Number(localStorage.getItem(INDEX_KEY)) || 0), Math.max(0, blocks(pack).length - 1)); }
  function setIndex(index) { localStorage.setItem(INDEX_KEY, String(Math.max(0, Number(index) || 0))); localStorage.setItem(STEP_KEY, '0'); remaining = 0; }
  function getStep(max) { return Math.min(Math.max(0, Number(localStorage.getItem(STEP_KEY)) || 0), Math.max(0, max - 1)); }
  function setStep(index) { localStorage.setItem(STEP_KEY, String(Math.max(0, Number(index) || 0))); }
  function drill(pack, drillId) { return (pack?.drills || []).find(d => d.id === drillId) || null; }
  function totalMinutes(plan) { return (plan?.blocks || []).reduce((sum, block) => sum + (Number(block.minutes || block.duration) || 0), 0); }
  function fmt(seconds) { const safe = Math.max(0, Number(seconds) || 0); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`; }
  function haptic(pattern = 25) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} }
  function categoryLabel(category) { return CATEGORY_LABELS[category] || category || 'Drill'; }
  function points(d) { return d?.coachingPoints || d?.points || d?.teachingPoints || []; }
  function textFor(d) { return `${d?.name || ''} ${d?.category || ''} ${(d?.tags || []).join(' ')} ${(d?.skillFocus || []).join(' ')} ${d?.iceUsage || ''} ${d?.difficulty || ''}`.toLowerCase(); }
  function normalizePreset(raw) { return String(raw || '').trim().toLowerCase().replace(/_/g, '-'); }
  function presetButtons() {
    return [
      ['half-ice', 'Half Ice'], ['full-ice', 'Full Ice'], ['no-goalie', 'No Goalie'], ['low-numbers', 'Low Numbers'],
      ['stations', 'Stations'], ['compete-more', 'Compete More'], ['simplify', 'Simplify'], ['make-harder', 'Make Harder'],
    ];
  }
  function matchesPreset(d, preset) {
    preset = normalizePreset(preset);
    const text = textFor(d);
    if (preset === 'half-ice') return text.includes('half') || text.includes('quarter') || d?.ice_type === 'quarter';
    if (preset === 'full-ice') return text.includes('full') || ['breakout', 'transition', 'cond'].includes(d?.category);
    if (preset === 'no-goalie') return d?.category !== 'goalie' && !d?.goalie && !text.includes('goalie');
    if (preset === 'low-numbers') return ['puck', 'skating', 'passing', 'shooting', 'battle', 'sag'].includes(d?.category) && !/10\+|12\+|full/.test(text);
    if (preset === 'stations') return text.includes('station') || text.includes('quarter') || ['skating', 'puck', 'shooting', 'passing'].includes(d?.category);
    if (preset === 'compete-more') return ['battle', 'sag'].includes(d?.category) || text.includes('compete') || text.includes('battle');
    if (preset === 'simplify') return d?.difficulty !== 'advanced';
    if (preset === 'make-harder') return ['advanced', 'intermediate'].includes(d?.difficulty) || ['battle', 'sag', 'transition', 'breakout'].includes(d?.category);
    return true;
  }
  function needsSwap(d, preset) {
    preset = normalizePreset(preset);
    const text = textFor(d);
    if (!d) return true;
    if (preset === 'no-goalie') return d.category === 'goalie' || d.goalie || text.includes('goalie');
    if (preset === 'half-ice') return text.includes('full ice') || d.ice_type === 'full' || d.iceUsage === 'full ice';
    if (preset === 'low-numbers') return /10\+|12\+|14\+|full line|5v5/.test(text);
    if (preset === 'simplify') return d.difficulty === 'advanced';
    if (preset === 'make-harder') return d.difficulty === 'beginner';
    return false;
  }
  function scoreReplacement(candidate, original, preset, used) {
    if (!candidate || used.has(candidate.id)) return -999;
    let score = Number(candidate.qualityScore || candidate.funRating || 5);
    if (matchesPreset(candidate, preset)) score += 40;
    if (candidate.category === original?.category) score += 8;
    const originalTags = new Set([...(original?.tags || []), ...(original?.skillFocus || [])]);
    [...(candidate.tags || []), ...(candidate.skillFocus || [])].forEach(tag => { if (originalTags.has(tag)) score += 2; });
    if (candidate.diagram) score += 5;
    return score;
  }
  function adaptationNote(preset) {
    return ({
      'half-ice': 'Shrink routes, use boards as boundaries, and run two groups if needed.',
      'full-ice': 'Add transition distance and finish through the far blue line.',
      'no-goalie': 'Use tires, mini-nets, cone gates, or target zones instead of goalie shots.',
      'low-numbers': 'Lower line sizes, reduce wait time, and rotate players quickly.',
      stations: 'Split the group into stations and rotate every 4-6 minutes.',
      'compete-more': 'Add scoring, possession, or puck-battle constraints.',
      simplify: 'Reduce reads and focus on one teaching cue.',
      'make-harder': 'Add pressure, timing, or a decision before the shot/pass.',
    })[normalizePreset(preset)] || 'Adjust spacing and pressure to fit the rink.';
  }
  function current(pack) {
    const index = getIndex(pack);
    const block = blocks(pack)[index];
    return { index, block, drill: drill(pack, block?.drillId) };
  }

  function injectStyles() {
    if (document.getElementById('benchStandaloneStyles')) return;
    const style = document.createElement('style');
    style.id = 'benchStandaloneStyles';
    style.textContent = `
      :root{color-scheme:dark;--teal:#9bf6ff;--gold:#f4cf57;--win:#4ad9a8;--danger:#ff7373}html,body{min-height:100%;background:#000;color:#fff;overscroll-behavior:contain}*{box-sizing:border-box}.bs{min-height:100vh;padding:max(14px,env(safe-area-inset-top)) 14px max(18px,env(safe-area-inset-bottom));display:grid;gap:14px;background:#000;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bs-top{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #333;padding-bottom:10px}.bs-brand{display:flex;gap:10px;align-items:center;min-width:0}.bs-mark{width:44px;height:44px;border-radius:14px;background:var(--teal);color:#001;display:grid;place-items:center;font-weight:1000}.bs-brand strong{display:block;font-size:18px;line-height:1}.bs-brand span{display:block;color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-top:4px}.bs-pill{border:1px solid #444;border-radius:999px;padding:8px 10px;color:#ddd;font-size:11px;white-space:nowrap}.bs-pill.good{border-color:var(--win);color:var(--win)}.bs-pill.warn{border-color:var(--gold);color:var(--gold)}.bs-card{border:1px solid #333;background:#080808;border-radius:18px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.35)}.bs-kicker{color:var(--teal);font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:900}.bs-title{margin:6px 0 4px;font-size:clamp(38px,12vw,76px);line-height:.9;font-weight:1000;letter-spacing:-1px}.bs-sub{color:#ddd;font-size:clamp(16px,3vw,22px);line-height:1.35;margin:8px 0 0}.bs-grid{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr))}.bs-metric{border:1px solid #333;border-radius:14px;padding:12px;background:#0d0d0d;text-align:center}.bs-metric strong{display:block;color:var(--teal);font-size:32px;line-height:1}.bs-metric span{display:block;margin-top:4px;color:#aaa;font-size:10px;text-transform:uppercase;letter-spacing:1px}.bs-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.bs-btn{min-height:60px;border-radius:14px;border:1px solid #3d3d3d;background:#111;color:#fff;font-weight:950;font-size:13px;letter-spacing:.8px;text-transform:uppercase;touch-action:manipulation;text-decoration:none;display:grid;place-items:center;text-align:center}.bs-btn.primary{background:var(--teal);color:#001;border-color:var(--teal)}.bs-btn.gold{background:var(--gold);color:#1b1300;border-color:var(--gold)}.bs-btn.danger{background:#240606;border-color:#683232;color:#ffdada}.bs-btn:active{transform:scale(.98);filter:brightness(1.16)}.bs-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.bs-presets .bs-btn{min-height:52px;font-size:11px;padding:6px}.bs-timer{display:grid;grid-template-columns:84px 1fr 84px;gap:10px;align-items:center}.bs-clock{text-align:center;font-size:clamp(54px,17vw,112px);line-height:.9;font-weight:1000;color:var(--gold);font-variant-numeric:tabular-nums}.bs-rink{width:min(100%,420px);margin-inline:auto;background:#f4fbff;border:4px solid #46616f;border-radius:18px;overflow:hidden}.bs-steps{display:grid;gap:6px}.bs-step{border:1px solid #333;border-radius:12px;padding:9px 10px;color:#ccc;background:#0b0b0b;font-size:13px;line-height:1.25}.bs-step.active{color:#001;background:var(--teal);border-color:var(--teal);font-weight:900}.bs-points{display:grid;gap:8px;margin:10px 0 0}.bs-points li{color:#fff;font-size:16px;line-height:1.35}.bs-note{width:100%;min-height:96px;border-radius:14px;background:#050505;color:#fff;border:1px solid #444;padding:12px;font:inherit;font-size:16px;line-height:1.35}.bs-empty{min-height:100vh;display:grid;place-items:center;padding:22px;text-align:center;color:#fff;background:#000}.bs-empty-card{max-width:620px;border:1px solid #333;border-radius:22px;padding:22px;background:#080808}.bs-empty-card h1{font-size:44px;line-height:.95;margin:8px 0 12px}.bs-empty-card p{color:#ddd;font-size:16px;line-height:1.55}.bs-link{color:#001;background:var(--teal);display:inline-block;padding:13px 18px;border-radius:999px;font-weight:900;text-decoration:none;margin-top:10px}@media(max-width:680px){.bs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bs-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.bs-presets{grid-template-columns:repeat(2,minmax(0,1fr))}.bs-timer{grid-template-columns:1fr}.bs-title{font-size:48px}}
    `;
    document.head.appendChild(style);
  }
  function mount() { return document.getElementById('benchStandaloneMount'); }

  function renderEmpty() {
    injectStyles();
    const el = mount();
    if (!el) return;
    el.innerHTML = `<div class="bs-empty"><div class="bs-empty-card"><div class="bs-kicker">Offline pack missing</div><h1>Preload before you get to the rink.</h1><p>Open the full app while you have service, build or load a practice, then press <strong>Preload Practice</strong> in Bench Mode. After that, this page can run the practice offline.</p><a class="bs-link" href="./app.html#bench">Open full app</a></div></div>`;
  }

  function renderDiagram(d, stepIndex = 0) {
    const diagram = d?.diagram || d?.animation || null;
    if (!diagram?.objects?.length) return `<div class="bs-card"><div class="bs-kicker">Animation</div><p class="bs-sub">No saved animation found for this drill in the offline pack.</p></div>`;
    const step = (diagram.sequence || [])[stepIndex] || null;
    const activeArrows = new Set(step?.arrowIndexes || []);
    const activeIds = new Set(step?.focusIds || []);
    const objectsById = Object.fromEntries((diagram.objects || []).map(o => [o.id, o]));
    const paths = (diagram.arrows || []).map((arrow, idx) => {
      const from = objectsById[arrow.from]; const to = objectsById[arrow.to];
      if (!from || !to) return '';
      const active = activeArrows.has(idx);
      const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2;
      const curved = arrow.style === 'curve' || arrow.style === 'loop';
      const dAttr = curved ? `M ${from.x} ${from.y} Q ${midX + 42} ${midY - 34}, ${to.x} ${to.y}` : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      const dash = arrow.dashed || arrow.style === 'dashed' ? 'stroke-dasharray="10 8"' : '';
      return `<path d="${dAttr}" ${dash} fill="none" stroke="${active ? '#f4cf57' : '#2563eb'}" stroke-width="${active ? 8 : 5}" stroke-linecap="round" marker-end="url(#arrow)" opacity="${active ? 1 : .78}" />`;
    }).join('');
    const objs = (diagram.objects || []).map(obj => {
      const active = activeIds.has(obj.id);
      const isGoal = obj.type === 'goal' || obj.id === 'NET';
      const isPuck = obj.type === 'puck' || obj.id === 'P';
      if (isGoal) return `<rect x="${obj.x - 34}" y="${obj.y - 8}" width="68" height="16" rx="4" fill="#ef4444" stroke="#7f1d1d" stroke-width="3" />`;
      const fill = isPuck ? '#111827' : (active ? '#f4cf57' : '#7dd3d8');
      const r = isPuck ? 7 : (active ? 18 : 15);
      return `<g><circle cx="${obj.x}" cy="${obj.y}" r="${r}" fill="${fill}" stroke="#0f172a" stroke-width="3"/><text x="${obj.x}" y="${obj.y + 5}" text-anchor="middle" font-family="system-ui" font-size="${isPuck ? 0 : 12}" font-weight="900" fill="#001">${esc(obj.label || '')}</text></g>`;
    }).join('');
    const sequence = diagram.sequence || [];
    return `<div class="bs-card"><div class="bs-kicker">Animated diagram</div><svg class="bs-rink" viewBox="0 0 300 500" role="img" aria-label="Animated drill diagram"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb" /></marker></defs><rect x="0" y="0" width="300" height="500" fill="#f8fcff"/><line x1="0" y1="250" x2="300" y2="250" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="8 8"/><circle cx="150" cy="250" r="58" fill="none" stroke="#dbeafe" stroke-width="4"/>${paths}${objs}</svg>${sequence.length ? `<div class="bs-actions" style="margin-top:10px"><button class="bs-btn" onclick="BenchBossBenchStandalone.prevStep()">◀ Step</button><button class="bs-btn primary" onclick="BenchBossBenchStandalone.nextStep()">Next Step ▶</button><button class="bs-btn" onclick="BenchBossBenchStandalone.autoStep()">Auto Step</button></div><div class="bs-steps" style="margin-top:10px">${sequence.map((s, idx) => `<button class="bs-step ${idx === stepIndex ? 'active' : ''}" onclick="BenchBossBenchStandalone.setStep(${idx})">${idx + 1}. ${esc(s.label || `Step ${idx + 1}`)}</button>`).join('')}</div>` : ''}</div>`;
  }

  function render() {
    injectStyles();
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {}); } catch {}
    const pack = readPack();
    if (!pack || !blocks(pack).length) return renderEmpty();
    if (localStorage.getItem(BENCH_OPENED_KEY) !== (pack.id || pack.createdAt || 'opened')) {
      localStorage.setItem(BENCH_OPENED_KEY, pack.id || pack.createdAt || 'opened');
      trackEvent('bench_mode_opened', { mode: 'standalone-offline', planTitle: pack.plan?.title || '', blocks: blocks(pack).length });
    }
    const { index, block, drill: d } = current(pack);
    const minutes = Number(block?.minutes || block?.duration || d?.duration || 5);
    if (!remaining) remaining = Math.max(60, minutes * 60);
    const sequence = d?.diagram?.sequence || d?.animation?.sequence || [];
    const stepIndex = getStep(sequence.length || 1);
    const note = pack.benchNotes?.[block?.id || block?.drillId] || '';
    const el = mount();
    if (!el) return;
    el.innerHTML = `<section class="bs"><div class="bs-top"><div class="bs-brand"><div class="bs-mark">BB</div><div><strong>BenchBoss Bench Mode</strong><span>${esc(pack.plan.title || 'Preloaded Practice')}</span></div></div><div class="bs-pill ${navigator.onLine ? 'good' : 'warn'}">${navigator.onLine ? 'Online' : 'Offline'} · ${esc(new Date(pack.createdAt).toLocaleDateString())}</div></div><div class="bs-grid"><div class="bs-metric"><strong>${index + 1}/${blocks(pack).length}</strong><span>Block</span></div><div class="bs-metric"><strong>${minutes}</strong><span>Minutes</span></div><div class="bs-metric"><strong>${pack.drills?.length || 0}</strong><span>Cached drills</span></div><div class="bs-metric"><strong id="bsClockSmall">${fmt(remaining)}</strong><span>Timer</span></div></div><article class="bs-card"><div class="bs-kicker">${esc(categoryLabel(d?.category || block?.category))}</div><h1 class="bs-title">${esc(block?.label || block?.title || d?.name || `Block ${index + 1}`)}</h1><p class="bs-sub">${esc(d?.description || block?.description || block?.notes || block?.benchAdaptation || 'Run this block using the coaching points below.')}</p>${block?.benchSwapReason ? `<p class="bs-sub" style="color:var(--gold)">${esc(block.benchSwapReason)}</p>` : ''}${block?.benchAdaptation ? `<p class="bs-sub" style="color:var(--gold)">${esc(block.benchAdaptation)}</p>` : ''}${points(d).length ? `<ul class="bs-points">${points(d).slice(0, 5).map(point => `<li>${esc(point)}</li>`).join('')}</ul>` : ''}</article><div class="bs-card bs-timer"><button class="bs-btn" onclick="BenchBossBenchStandalone.addMinute(-1)">-1 min</button><div class="bs-clock" id="bsClock">${fmt(remaining)}</div><button class="bs-btn" onclick="BenchBossBenchStandalone.addMinute(1)">+1 min</button><button class="bs-btn primary" onclick="BenchBossBenchStandalone.toggleTimer()">${timer ? 'Pause' : 'Start'}</button></div><div class="bs-actions"><button class="bs-btn" onclick="BenchBossBenchStandalone.prevBlock()">◀ Prev</button><button class="bs-btn primary" onclick="BenchBossBenchStandalone.nextBlock()">Next ▶</button><button class="bs-btn gold" onclick="BenchBossBenchStandalone.swapCurrent()">Swap Drill</button>${d?.id ? `<a class="bs-btn" href="./whiteboard.html?source=bench&drillId=${encodeURIComponent(d.id)}&step=${stepIndex}">Freeze + Annotate</a>` : `<a class="bs-btn" href="./whiteboard.html?source=bench">Whiteboard</a>`}</div>${renderDiagram(d, stepIndex)}<div class="bs-card"><div class="bs-kicker">One-tap adjustments</div><div class="bs-presets">${presetButtons().map(([id, label]) => `<button class="bs-btn" onclick="BenchBossBenchStandalone.applyPreset('${id}')">${esc(label)}</button>`).join('')}</div></div><div class="bs-card"><div class="bs-kicker">Quick coach note</div><textarea class="bs-note" id="standaloneNote" placeholder="What happened in this block?">${esc(note)}</textarea><div class="bs-actions" style="margin-top:10px"><button class="bs-btn primary" onclick="BenchBossBenchStandalone.saveNote()">Save Note</button><button class="bs-btn gold" onclick="BenchBossBenchStandalone.completePractice()">Complete + Recap</button><a class="bs-btn" href="./app.html#bench">Full App</a></div></div></section>`;
  }

  function updateClock() {
    const main = document.getElementById('bsClock');
    const small = document.getElementById('bsClockSmall');
    if (main) main.textContent = fmt(remaining);
    if (small) small.textContent = fmt(remaining);
  }
  function toggleTimer() {
    if (timer) { clearInterval(timer); timer = null; render(); return; }
    timer = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      updateClock();
      if (remaining <= 0) { clearInterval(timer); timer = null; haptic([120, 80, 120]); render(); }
    }, 1000);
    render();
  }
  function addMinute(delta) { remaining = Math.max(0, remaining + (Number(delta) || 0) * 60); updateClock(); render(); }
  function prevBlock() { const pack = readPack(); setIndex(getIndex(pack) - 1); haptic(20); render(); }
  function nextBlock() { const pack = readPack(); setIndex(getIndex(pack) + 1); haptic(20); render(); }
  function setStep(index) { setStepInternal(index); haptic(15); render(); }
  function setStepInternal(index) { localStorage.setItem(STEP_KEY, String(Math.max(0, Number(index) || 0))); }
  function prevStep() { setStep(Math.max(0, getStep(999) - 1)); }
  function nextStep() { const pack = readPack(); const { drill: d } = current(pack); const max = Math.max(1, (d?.diagram?.sequence || d?.animation?.sequence || []).length); setStep(Math.min(max - 1, getStep(max) + 1)); }
  function autoStep() { nextStep(); setTimeout(() => { if (document.getElementById('benchStandaloneMount')) nextStep(); }, 900); }
  function saveNote() {
    const pack = readPack(); const { block } = current(pack);
    pack.benchNotes = pack.benchNotes || {};
    pack.benchNotes[block?.id || block?.drillId || `note-${Date.now()}`] = String(document.getElementById('standaloneNote')?.value || '').slice(0, 800);
    writePack(pack); haptic(35); render();
  }
  function applyPreset(preset) {
    const pack = readPack(); if (!pack) return;
    const used = new Set(blocks(pack).map(b => b.drillId).filter(Boolean));
    let swaps = 0;
    blocks(pack).forEach(block => {
      const original = drill(pack, block.drillId);
      if (!needsSwap(original, preset) && matchesPreset(original, preset)) return;
      const replacement = (pack.drills || []).filter(candidate => candidate.id !== original?.id)
        .map(candidate => ({ candidate, score: scoreReplacement(candidate, original, preset, used) }))
        .sort((a, b) => b.score - a.score)[0]?.candidate;
      if (replacement && scoreReplacement(replacement, original, preset, used) > -20) {
        block.benchSwapReason = `${preset}: ${original?.name || 'drill'} -> ${replacement.name}`;
        block.drillId = replacement.id;
        used.add(replacement.id);
        swaps += 1;
      } else {
        block.benchAdaptation = adaptationNote(preset);
      }
    });
    pack.lastBenchAdjustment = { preset, swaps, at: new Date().toISOString() };
    if (swaps) trackEvent('drill_swapped', { source: 'bench-standalone-preset', preset, swaps });
    writePack(pack); haptic([30, 20, 30]); render();
  }
  function swapCurrent() {
    const pack = readPack(); if (!pack) return;
    const { block, drill: original } = current(pack);
    const used = new Set(blocks(pack).map(b => b.drillId).filter(Boolean));
    const replacement = (pack.drills || []).filter(candidate => candidate.id !== original?.id)
      .map(candidate => ({ candidate, score: scoreReplacement(candidate, original, 'compete-more', used) + scoreReplacement(candidate, original, 'simplify', used) }))
      .sort((a, b) => b.score - a.score)[0]?.candidate;
    if (replacement) {
      block.benchSwapReason = `Offline live swap: ${original?.name || 'drill'} -> ${replacement.name}`;
      block.drillId = replacement.id;
      trackEvent('drill_swapped', { source: 'bench-standalone', fromDrillId: original?.id || null, toDrillId: replacement.id, preset: 'live-swap' });
      writePack(pack);
      haptic([35, 20, 35]);
    }
    render();
  }
  function getRecaps() { try { return JSON.parse(localStorage.getItem(RECAPS_KEY) || '[]'); } catch { return []; } }
  function completePractice() {
    saveNote();
    const pack = readPack(); if (!pack) return;
    const notes = Object.values(pack.benchNotes || {}).filter(Boolean);
    const body = `${pack.plan.title || 'Practice'} complete. We worked through ${blocks(pack).length} blocks and ${totalMinutes(pack.plan)} minutes.${notes.length ? `\n\nCoach notes:\n${notes.map(note => `- ${note}`).join('\n')}` : ''}`;
    const recap = { id: crypto.randomUUID(), title: `${pack.plan.title || 'Practice'} Recap`, body, notes, createdAt: new Date().toISOString(), source: 'bench-standalone' };
    const recaps = getRecaps(); recaps.unshift(recap); localStorage.setItem(RECAPS_KEY, JSON.stringify(recaps.slice(0, 25)));
    trackEvent('practice_completed', { source: 'bench-standalone', planTitle: pack.plan?.title || '', blocks: blocks(pack).length, notes: notes.length });
    haptic([80, 40, 80]);
    mount().innerHTML = `<section class="bs"><div class="bs-top"><div class="bs-brand"><div class="bs-mark">✓</div><div><strong>Practice complete</strong><span>Saved locally on this device</span></div></div><div class="bs-pill good">Ready</div></div><div class="bs-card"><div class="bs-kicker">Recap</div><h1 class="bs-title">Good work.</h1><p class="bs-sub">Your recap is saved offline. Open the full app when you are back online to publish it to parents/staff.</p><textarea class="bs-note" readonly>${esc(body)}</textarea><div class="bs-actions" style="margin-top:10px"><button class="bs-btn primary" onclick="navigator.clipboard?.writeText(${JSON.stringify(body)})">Copy Recap</button><a class="bs-btn gold" href="./app.html#bench">Open Full App</a><button class="bs-btn" onclick="BenchBossBenchStandalone.render()">Back</button></div></div></section>`;
  }

  window.BenchBossBenchStandalone = { render, toggleTimer, addMinute, prevBlock, nextBlock, setStep, prevStep, nextStep, autoStep, saveNote, applyPreset, swapCurrent, completePractice };
  window.addEventListener('DOMContentLoaded', render);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
})();
