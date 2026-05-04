// src/features/practice/practice-ui.js
// -----------------------------------------------------------------------------
// Practice plan editing, drill library UI, season planner, practice generator,
// and on-ice mode for BenchBoss Coach HQ.
//
// Loaded as a NON-module classic script before the inline <script> in
// app.html so its declarations are visible by bare name.
//
// Refactor step 3 of HUMAN_LAUNCH_PLAN §7.
//
// Depends on globals provided elsewhere:
//   state, save()                  <- src/features/app/app-state.js
//   sortRoster, populateRosterDatalist, renderStats, renderDashboard
//                                  <- src/features/roster/roster.js
//   CATEGORIES, PRELOADED_DRILLS,
//   BearDenEditor                  <- app.html (domain constants and editor handle)
//   toast, escapeHtml,
//   formatDateShort, formatTime    <- app.html (utilities)
//   navTo                          <- app.html (navigation)
//   window.BearDenHQ.*             <- the practice-engine, sharing, AI builder
//                                     modules already register on window
// -----------------------------------------------------------------------------

// ============================================
// PRACTICE PLAN
// ============================================
function completeCurrentPractice() {
  if (!state.currentPlan?.blocks?.length) { toast('Build a practice before completing it'); return; }
  if (!window.BearDenHQ?.completePracticePlan) { toast('Tracking not ready'); return; }
  const title = state.currentPlan.title || 'Current practice';
  if (!confirm('Mark "' + title + '" complete and update team development tracking?')) return;
  try {
    window.BearDenHQ.completePracticePlan(state.currentPlan, state);
    if (!state.currentPlan.id) state.currentPlan.id = crypto.randomUUID();
    save();
    renderCurrentPlan();
    renderDashboard();
    toast('Practice completed and tracking updated');
  } catch (error) {
    toast(error.message || 'Could not complete practice');
  }
}

async function shareCurrentPracticePlan() {
  if (!state.currentPlan?.blocks?.length) { toast("Build a practice before sharing"); return; }
  if (!window.BearDenHQ?.shareCurrentPractice) { toast("Sharing not ready"); return; }
  try {
    const result = await window.BearDenHQ.shareCurrentPractice(state.currentPlan, state);
    state.currentPlan.id = result.id;
    save();
    window.BearDenHQ?.trackEvent?.("share_link_created", { planId: result.id });
    toast("Share link copied");
  } catch (error) {
    toast(error.message || "Share failed");
  }
}

async function downloadCurrentPracticePdf() {
  if (!state.currentPlan?.blocks?.length) { toast("Build a practice before exporting"); return; }
  if (!window.BearDenHQ?.exportPracticeToPdf) { toast("PDF export not ready"); return; }
  try {
    await window.BearDenHQ.exportPracticeToPdf(state.currentPlan, state);
    window.BearDenHQ?.trackEvent?.("pdf_exported", { planId: state.currentPlan.id || null, blocks: state.currentPlan.blocks.length });
  } catch (error) {
    toast(error.message || "PDF export failed");
  }
}

 function renderCurrentPlan() {
  const p = state.currentPlan;
  document.getElementById('planDate').value = p.date;
  document.getElementById('planTitle').value = p.title;
  document.getElementById('planTheme').value = p.theme;
  document.getElementById('planTotal').value = p.totalMinutes;

  const container = document.getElementById('currentPlanBlocks');
  if (p.blocks.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 20px"><div class="icon">✱</div>No drills yet. Tap drills below to add.</div>`;
  } else {
    container.innerHTML = p.blocks.map((b, i) => {
      const drill = state.drills.find(d => d.id === b.drillId);
      if (!drill) return '';
      return `
        <div class="plan-block-card">
          <div class="block-num">${i + 1}</div>
          <div class="block-info">
            <div class="bt">${escapeHtml(drill.name)}</div>
            <div class="bm">${escapeHtml([b.label || '', CATEGORIES.find(c => c.id === drill.category)?.label || ''].filter(Boolean).join(' • '))}</div>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 3px; text-transform: uppercase; letter-spacing: .7px">${escapeHtml([drill.ageLevels?.join("/"), drill.iceUsage, drill.difficulty, drill.playerCount ? drill.playerCount + " players" : ""].filter(Boolean).join(" · "))}</div>
            ${window.BearDenHQ?.renderScorePanel ? window.BearDenHQ.renderScorePanel(window.BearDenHQ.scoreDrill(drill, { ageGroup: document.getElementById('genAgeGroup')?.value || '10U', includeGoalie: document.getElementById('genIncludeGoalie')?.checked !== false, focus: p.theme })) : ''}
            ${b.objective ? `<div style="font-size: 10px; color: var(--text-mid); margin-top: 4px; line-height: 1.45">${escapeHtml(b.objective)}</div>` : ''}
            ${b.coachNote ? `<div style="font-size: 10px; color: var(--teal); margin-top: 4px; line-height: 1.45">${escapeHtml(b.coachNote)}</div>` : ''}
            ${b.teachingMoment ? `<div style="font-size: 10px; color: var(--text-mid); margin-top: 4px; line-height: 1.45"><strong>Freeze:</strong> ${escapeHtml(b.teachingMoment)}</div>` : ''}
            ${drill.diagram ? `<div id="planAnimatedViewer_${i}" onclick="event.stopPropagation()"></div><div style="display:flex; gap:4px; margin-top:6px"><button class="btn small" onclick="event.stopPropagation(); playPlanDiagram(${i})">▶ Quick Play</button><button class="btn small" onclick="event.stopPropagation(); openAnimatedViewer('${drill.id}')">Viewer</button><button class="btn small" onclick="event.stopPropagation(); openDrillCreator('${drill.id}')">Edit Diagram</button></div>` : ''}
          </div>
          <input type="number" class="time-input" value="${b.minutes}" min="1" max="60" onchange="updateBlockMinutes(${i}, this.value)">
          <button class="del" onclick="removeBlock(${i})">✕</button>
        </div>
      `;
    }).join('');
  }
  renderAIPracticeSummary();
  if (window.BearDenHQ?.createAnimatedDrillViewer) {
    p.blocks.forEach((block, index) => {
      const drill = state.drills.find(d => d.id === block.drillId);
      if (drill?.diagram) window.BearDenHQ.createAnimatedDrillViewer(`planAnimatedViewer_${index}`, drill, { compact: true, showTitle: false });
    });
  } else if (window.BearDenHQ?.drawDrillDiagram) {
    p.blocks.forEach((block, index) => {
      const drill = state.drills.find(d => d.id === block.drillId);
      if (drill?.diagram) window.BearDenHQ.drawDrillDiagram(`planDiagram_${index}`, drill);
    });
  }
  renderPlanBudget();
  renderBenchReadiness();
  window.BenchBossBench?.hydrateBenchWorkflowPanel?.(state);
}

let planDiagramPlayer = null;
function playPlanDiagram(index) {
  const block = state.currentPlan.blocks[index];
  const drill = block ? state.drills.find(d => d.id === block.drillId) : null;
  if (!drill?.diagram || !window.BearDenHQ?.playDrillDiagram) return;
  if (planDiagramPlayer) { planDiagramPlayer.stop(); planDiagramPlayer = null; }
  const mount = document.getElementById(`planAnimatedViewer_${index}`);
  if (mount?.__bdhViewer) { mount.__bdhViewer.play(); return; }
  planDiagramPlayer = window.BearDenHQ.playDrillDiagram(`planDiagram_${index}`, drill, {
    onComplete: () => { planDiagramPlayer = null; }
  });
}
function renderPlanBudget() {
  const total = state.currentPlan.totalMinutes || 55;
  const used = state.currentPlan.blocks.reduce((s, b) => s + (b.minutes || 0), 0);
  const remaining = total - used;
  document.getElementById('timeUsed').textContent = used;
  document.getElementById('timeRemaining').textContent = remaining;
  document.getElementById('blockCount').textContent = state.currentPlan.blocks.length;
  document.getElementById('timeBudget').classList.toggle('over', remaining < 0);
  const hasGoalie = state.currentPlan.blocks.some(b => {
    const d = state.drills.find(x => x.id === b.drillId);
    return d && d.category === 'goalie';
  });
  document.getElementById('goalieWarning').classList.toggle('show', !hasGoalie && state.currentPlan.blocks.length > 0);
}

function saveCurrentPlan() {
  state.currentPlan.date = document.getElementById('planDate').value;
  state.currentPlan.title = document.getElementById('planTitle').value;
  state.currentPlan.theme = document.getElementById('planTheme').value;
  state.currentPlan.totalMinutes = parseInt(document.getElementById('planTotal').value) || 55;
  save();
}

function addDrillToPlan(drillId) {
  const drill = state.drills.find(d => d.id === drillId);
  if (!drill) return;
  state.currentPlan.blocks.push({ id: crypto.randomUUID(), drillId, minutes: drill.duration });
  save();
  renderCurrentPlan();
  toast(`+ ${drill.name}`);
}

function updateBlockMinutes(idx, val) {
  state.currentPlan.blocks[idx].minutes = parseInt(val) || 0;
  save();
  renderPlanBudget();
  window.BenchBossBenchMode?.hydrateBenchPrepPanel?.(state);
  window.BenchBossBench?.hydrateBenchWorkflowPanel?.(state);
}

function removeBlock(idx) {
  state.currentPlan.blocks.splice(idx, 1);
  save();
  renderCurrentPlan();
}

function clearCurrentPlan() {
  if (!confirm('Clear current plan?')) return;
  state.currentPlan = { id: null, date: new Date().toISOString().slice(0,10), title: '', theme: '', progression: 'Balanced', totalMinutes: 55, notes: '', blocks: [] };
  save();
  renderCurrentPlan();
  toast('Cleared');
}

function saveNamedPlan() {
  const title = document.getElementById('planTitle').value.trim();
  if (!title) { toast('Add a title first'); return; }
  state.currentPlan.blocks.forEach(b => {
    const d = state.drills.find(x => x.id === b.drillId);
    if (d) d.usage = (d.usage || 0) + 1;
  });
  const planData = {
    id: state.currentPlan.id || crypto.randomUUID(),
    date: state.currentPlan.date,
    title: state.currentPlan.title,
    theme: state.currentPlan.theme,
    progression: state.currentPlan.progression,
    totalMinutes: state.currentPlan.totalMinutes,
    notes: state.currentPlan.notes,
    coachBrain: state.currentPlan.coachBrain || null,
    blocks: JSON.parse(JSON.stringify(state.currentPlan.blocks)),
    savedAt: new Date().toISOString(),
  };
  const existing = state.plans.findIndex(p => p.id === planData.id);
  if (existing >= 0) state.plans[existing] = planData;
  else state.plans.push(planData);
  state.currentPlan.id = planData.id;
  save();
  renderSavedPlans();
  toast('Plan saved');
}

function loadSavedPlan(id) {
  const p = state.plans.find(x => x.id === id);
  if (!p) return;
  state.currentPlan = { ...p, blocks: JSON.parse(JSON.stringify(p.blocks)) };
  save();
  renderCurrentPlan();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(`Loaded "${p.title}"`);
}

function deleteSavedPlan(id) {
  if (!confirm('Delete saved plan?')) return;
  state.plans = state.plans.filter(p => p.id !== id);
  save();
  renderSavedPlans();
}

function renderSavedPlans() {
  const container = document.getElementById('savedPlansList');
  if (state.plans.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 20px">No saved plans</div>`;
    return;
  }
  const sorted = [...state.plans].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  container.innerHTML = sorted.map(p => `
    <div style="background: var(--panel-hi); border: 1px solid var(--border); border-left: 3px solid var(--teal); padding: 10px 12px; border-radius: 3px; margin-bottom: 6px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
        <div style="font-family: 'Oswald'; font-size: 13px">${escapeHtml(p.title)}</div>
        <div style="font-size: 10px; color: var(--teal)">${p.date || ''}</div>
      </div>
      <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 8px">${p.blocks.length} drills · ${p.blocks.reduce((s, b) => s + b.minutes, 0)} min${p.progression ? ' · ' + escapeHtml(p.progression) : ''}</div>
      <div style="display: flex; gap: 4px">
        <button class="btn small" onclick="loadSavedPlan('${p.id}')">Load</button>
        <button class="btn small danger" onclick="deleteSavedPlan('${p.id}')">Del</button>
      </div>
    </div>
  `).join('');
}

function renderSeasonPlanner() {
  const container = document.getElementById('seasonPlannerList');
  const startInput = document.getElementById('seasonStart');
  if (startInput && !startInput.value) startInput.value = new Date().toISOString().slice(0, 10);
  if (!container) return;
  if (!state.seasons || state.seasons.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 20px">No season progression built yet</div>`;
    return;
  }
  const season = state.seasons[0];
  container.innerHTML = season.weeks.map((week, index) => `
    <div style="background: var(--panel-hi); border: 1px solid var(--border); border-left: 3px solid var(--teal); padding: 10px 12px; border-radius: 3px; margin-bottom: 8px">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center">
        <div style="font-family:'Oswald'; font-size:13px">${escapeHtml(`Week ${week.week} • ${week.label}`)}</div>
        <div style="font-size:10px; color:var(--teal)">${escapeHtml(week.date)}</div>
      </div>
      <div style="font-size:11px; color:var(--text-mid); margin-top:4px">${escapeHtml(week.summary || '')}</div>
      <div style="font-size:11px; color:var(--text-dim); margin-top:6px">${escapeHtml(week.practice?.title || week.practice?.name || '')}</div>
      ${week.measurement ? `<div style="font-size:10px; color:var(--text-dim); margin-top:4px"><strong>Measure:</strong> ${escapeHtml(week.measurement)}</div>` : ''}
      <div style="display:flex; gap:4px; margin-top:10px">
        <button class="btn small" onclick="openSeasonWeek(${index})">Open</button>
        <button class="btn small" onclick="regenerateSeasonWeek(${index})">Regen</button>
      </div>
    </div>
  `).join('');
}

function buildSeasonPlan() {
  const focus = document.getElementById('seasonFocus')?.value || 'mixed';
  const start = document.getElementById('seasonStart')?.value || new Date().toISOString().slice(0, 10);
  const ageGroup = document.getElementById('genAgeGroup')?.value || '10U';
  const includeGoalie = document.getElementById('genIncludeGoalie')?.checked !== false;
  const duration = Number(document.getElementById('genDuration')?.value || 60);

  if (window.BearDenHQ?.buildSeasonCurriculum) {
    state.seasons = [window.BearDenHQ.buildSeasonCurriculum({ focus, startDate: start, weeks: 12, duration, ageGroup, includeGoalie }, state)];
  } else {
    const weekProfiles = [
      { week: 1, label: 'Teach', summary: 'Foundational reps. Clean execution first.', progression: 'teach', theme: focus },
      { week: 2, label: 'Add Pressure', summary: 'Same concept with pressure and opposition.', progression: 'pressure', theme: focus === 'mixed' ? 'passing' : focus },
      { week: 3, label: 'Game Transfer', summary: 'Push the concept into flow and reads.', progression: 'transfer', theme: focus === 'mixed' ? 'forecheck' : focus },
      { week: 4, label: 'Compete', summary: 'Game-like compete and application.', progression: 'compete', theme: focus === 'mixed' ? 'mixed' : focus },
    ];
    const baseDate = new Date(`${start}T12:00:00`);
    const season = {
      id: `season_${Date.now()}`,
      focus,
      name: `${focus.charAt(0).toUpperCase() + focus.slice(1)} Progression`,
      startDate: start,
      weeks: weekProfiles.map((profile, index) => {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + index * 7);
        const practice = window.BearDenHQ?.generateCoachPlan?.({ theme: profile.theme, progression: profile.progression, duration: 55, avoidRecent: index !== 0 }, state);
        practice.title = `Week ${profile.week}: ${profile.label}`;
        practice.date = date.toISOString().slice(0, 10);
        return { ...profile, date: practice.date, practice };
      }),
    };
    state.seasons = [season];
  }
  save();
  renderSeasonPlanner();
  toast('Season curriculum built');
}
function openSeasonWeek(index) {
  const week = state.seasons?.[0]?.weeks?.[index];
  if (!week?.practice) return;
  state.currentPlan = JSON.parse(JSON.stringify(week.practice));
  save();
  navTo('practice');
  toast(`Loaded ${week.label}`);
}

function regenerateSeasonWeek(index) {
  const season = state.seasons?.[0];
  const week = season?.weeks?.[index];
  if (!week) return;
  week.practice = window.BearDenHQ?.generateCoachPlan?.({ theme: week.theme, progression: week.progression, duration: 55, avoidRecent: true }, state);
  week.practice.title = `Week ${week.week}: ${week.label}`;
  week.practice.date = week.date;
  save();
  renderSeasonPlanner();
  toast(`Regenerated week ${week.week}`);
}

function renderDrillList() {
  const chipsContainer = document.getElementById('categoryChips');
  const filter = state.ui.drillCategoryFilter;
  chipsContainer.innerHTML = `<div class="chip ${!filter ? 'active' : ''}" onclick="setDrillFilter(null)">All</div>` +
    CATEGORIES.map(c => `<div class="chip ${filter === c.id ? 'active' : ''}" onclick="setDrillFilter('${c.id}')">${c.label}</div>`).join('');

  const search = (document.getElementById('drillSearch')?.value || '').toLowerCase();
  const filtered = state.drills.filter(d => {
    if (filter && d.category !== filter) return false;
    if (search && !(d.name + ' ' + d.description).toLowerCase().includes(search)) return false;
    return true;
  });

  document.getElementById('drillLibCount').textContent = `${filtered.length}${filter || search ? ' / ' + state.drills.length : ''}`;

  const list = document.getElementById('drillList');
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding: 20px">No drills match</div>`;
    return;
  }
  list.innerHTML = filtered.map(d => `
    <div class="drill-card cat-${d.category}" onclick="addDrillToPlan('${d.id}')">
      <div class="drill-header">
        <div class="drill-title">${escapeHtml(d.name)}</div>
        <div class="drill-duration">${d.duration} min</div>
      </div>
      <div class="drill-desc">${escapeHtml(d.description || '')}</div>
      ${window.BearDenHQ?.renderScoreBadge ? `<div style="margin-top: 8px">${window.BearDenHQ.renderScoreBadge(window.BearDenHQ.scoreDrill(d, { ageGroup: document.getElementById('genAgeGroup')?.value || '10U', includeGoalie: document.getElementById('genIncludeGoalie')?.checked !== false, focus: state.ui.genTheme }))}</div>` : ''}
      <div class="drill-category-badge">${escapeHtml(CATEGORIES.find(c => c.id === d.category)?.label || '')}${d.usage > 0 ? ' · used ' + d.usage + 'x' : ''}</div>
      <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap">
        ${d.diagram ? `<button class="btn small" onclick="event.stopPropagation(); openAnimatedViewer('${d.id}')">Animated Viewer</button>` : ''}
        <button class="btn small" onclick="event.stopPropagation(); openDrillCreator('${d.id}')">Edit</button>
      </div>
    </div>
  `).join('');
}

function setDrillFilter(cat) {
  state.ui.drillCategoryFilter = cat;
  save();
  renderDrillList();
}


function openAnimatedViewer(drillId) {
  if (window.BearDenHQ?.openAnimatedDrillViewer) {
    window.BearDenHQ.openAnimatedDrillViewer(drillId, state);
  }
}

function closeAnimatedViewer() {
  if (window.BearDenHQ?.closeAnimatedDrillViewer) {
    window.BearDenHQ.closeAnimatedDrillViewer();
  }
}

function openDrillCreator(id = null) {
  state.ui.editingDrillId = id;
  document.getElementById('drillModalTitle').textContent = id ? 'Edit Drill' : 'New Drill';
  document.getElementById('drillDeleteBtn').style.display = id ? 'inline-block' : 'none';
  const sel = document.getElementById('drillCategory');
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  if (id) {
    const d = state.drills.find(x => x.id === id);
    document.getElementById('drillName').value = d.name || '';
    document.getElementById('drillDuration').value = d.duration || 8;
    document.getElementById('drillCategory').value = d.category || 'skating';
    document.getElementById('drillDescription').value = d.description || '';
    document.getElementById('drillPoints').value = d.points || '';
    document.getElementById('drillModal').classList.add('show');
    requestAnimationFrame(() => {
      BearDenEditor?.openEditor?.({ initial: d.diagram || { rink: 'half_ice', objects: [], arrows: [] } });
      bindEditorToolbar();
    });
  } else {
    document.getElementById('drillName').value = '';
    document.getElementById('drillDuration').value = 8;
    document.getElementById('drillCategory').value = 'skating';
    document.getElementById('drillDescription').value = '';
    document.getElementById('drillPoints').value = '';
    document.getElementById('drillModal').classList.add('show');
    requestAnimationFrame(() => {
      BearDenEditor?.openEditor?.({ initial: { rink: 'half_ice', objects: [], arrows: [] } });
      bindEditorToolbar();
    });
  }
}

function closeDrillEditor() {
  document.getElementById('drillModal').classList.remove('show');
  state.ui.editingDrillId = null;
  BearDenEditor?.closeEditor?.();
}

function saveDrillFromEditor() {
  const name = document.getElementById('drillName').value.trim();
  if (!name) { toast('Needs a name'); return; }
  const data = {
    name,
    duration: parseInt(document.getElementById('drillDuration').value) || 8,
    category: document.getElementById('drillCategory').value,
    description: document.getElementById('drillDescription').value,
    points: document.getElementById('drillPoints').value,
    coaching_points: document.getElementById('drillPoints').value.split('\n').map(s => s.trim()).filter(Boolean),
    diagram: BearDenEditor?.getEditorDiagram?.() || null,
    ice_type: (BearDenEditor?.getEditorDiagram?.()?.rink === 'quarter_ice') ? 'quarter' : 'half',
    intensity: 'medium',
  };
  if (state.ui.editingDrillId) {
    const idx = state.drills.findIndex(d => d.id === state.ui.editingDrillId);
    if (idx >= 0) state.drills[idx] = { ...state.drills[idx], ...data };
    toast('Drill updated');
  } else {
    state.drills.push({ id: crypto.randomUUID(), ...data, isCustom: true, usage: 0 });
    toast('Drill added');
  }
  save();
  closeDrillEditor();
  renderDrillList();
}

function deleteCurrentDrill() {
  if (!state.ui.editingDrillId) return;
  if (!confirm('Delete this drill?')) return;
  state.drills = state.drills.filter(d => d.id !== state.ui.editingDrillId);
  save();
  closeDrillEditor();
  renderDrillList();
}

function bindEditorToolbar() {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.onclick = () => BearDenEditor?.setTool?.(btn.dataset.tool);
  });
}

function toggleEditorRink() {
  BearDenEditor?.toggleRink?.();
}

function undoEditorChange() {
  BearDenEditor?.undoLast?.();
}

function clearEditorCanvas() {
  BearDenEditor?.clearDiagram?.();
}

// ============================================
// PRACTICE GENERATOR
// ============================================
// Theme -> category weights. Generator pulls drills using weighted random
// selection, enforcing block structure (warmup -> skill -> SAG -> compete -> wrap).
const THEME_WEIGHTS = {
  breakout:  { breakout: 55, passing: 20, dzone: 15, sag: 10 },
  passing:   { passing: 50, puck: 20, sag: 20, skating: 10 },
  forecheck: { ozone: 50, battle: 25, sag: 15, skating: 10 },
  compete:   { sag: 40, battle: 30, ozone: 15, dzone: 15 },
  skating:   { skating: 55, puck: 25, passing: 20 },
  mixed:     { skating: 15, passing: 15, shooting: 10, battle: 10, breakout: 15, dzone: 10, ozone: 10, sag: 15 },
};

// Block structure by duration (in minutes)
function planStructureForDuration(minutes) {
  if (minutes <= 45) {
    return [
      { kind: 'warmup',   categories: ['skating', 'puck'], label: 'Warm-Up' },
      { kind: 'skill',    weighted: true,                  label: 'Skill' },
      { kind: 'skill',    weighted: true,                  label: 'Skill' },
      { kind: 'sag',      categories: ['sag', 'battle'],    label: 'Small Area' },
      { kind: 'compete',  categories: ['sag'],              label: 'Compete Game' },
    ];
  }
  if (minutes <= 60) {
    return [
      { kind: 'warmup',   categories: ['skating', 'puck'], label: 'Warm-Up' },
      { kind: 'skill',    weighted: true,                  label: 'Skill A' },
      { kind: 'skill',    weighted: true,                  label: 'Skill B' },
      { kind: 'sag',      categories: ['sag', 'battle'],    label: 'Small Area' },
      { kind: 'compete',  categories: ['sag'],              label: 'Compete Game' },
      { kind: 'wrap',     categories: ['cond', 'shooting'], label: 'Finisher' },
    ];
  }
  if (minutes <= 75) {
    return [
      { kind: 'warmup',   categories: ['skating', 'puck'], label: 'Warm-Up' },
      { kind: 'skill',    weighted: true,                  label: 'Skill A' },
      { kind: 'skill',    weighted: true,                  label: 'Skill B' },
      { kind: 'sag',      categories: ['sag', 'battle'],    label: 'Small Area' },
      { kind: 'skill',    categories: ['shooting', 'battle'], label: 'Shooting / Battles' },
      { kind: 'compete',  categories: ['sag'],              label: 'Compete Game' },
      { kind: 'wrap',     categories: ['cond'],             label: 'Finisher' },
    ];
  }
  // 90+
  return [
    { kind: 'warmup',   categories: ['skating', 'puck'], label: 'Warm-Up' },
    { kind: 'skill',    weighted: true,                  label: 'Skill A' },
    { kind: 'skill',    weighted: true,                  label: 'Skill B' },
    { kind: 'sag',      categories: ['sag', 'battle'],    label: 'Small Area' },
    { kind: 'skill',    categories: ['shooting'],         label: 'Shooting' },
    { kind: 'skill',    categories: ['battle'],           label: 'Battles' },
    { kind: 'compete',  categories: ['sag'],              label: 'Compete Game' },
    { kind: 'wrap',     categories: ['cond'],             label: 'Finisher' },
  ];
}

function selectGenTheme(theme) {
  state.ui.genTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.theme === theme);
  });
  save();
}

function updateGenProgression(progression) {
  state.ui.genProgression = progression;
  save();
}

// Calculate fatigue for a drill: how recently it was used in saved plans.
// Returns a penalty multiplier 0..1 where 1 = no penalty, 0 = fully excluded.
function drillFatigue(drillId) {
  const now = Date.now();
  let penalty = 1;
  // Look through the most recent 5 saved plans
  const recentPlans = [...state.plans]
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
    .slice(0, 5);
  recentPlans.forEach((plan, planIdx) => {
    if (plan.blocks.some(b => b.drillId === drillId)) {
      // Most recent plan = heaviest penalty, decays for older plans
      const recencyWeight = [0.15, 0.3, 0.5, 0.7, 0.85][planIdx] || 1;
      penalty = Math.min(penalty, recencyWeight);
    }
  });
  return penalty;
}

function pickDrillFromPool(pool, usedInThisPlan, avoidRecent) {
  // Filter out drills already used in this plan
  let candidates = pool.filter(d => !usedInThisPlan.has(d.id));
  if (candidates.length === 0) candidates = pool; // fallback if we've exhausted pool

  // Build weighted array
  const weighted = candidates.map(d => ({
    drill: d,
    weight: avoidRecent ? drillFatigue(d.id) : 1,
  }));

  const totalWeight = weighted.reduce((s, x) => s + x.weight, 0);
  if (totalWeight === 0) return candidates[Math.floor(Math.random() * candidates.length)];

  let r = Math.random() * totalWeight;
  for (const x of weighted) {
    r -= x.weight;
    if (r <= 0) return x.drill;
  }
  return weighted[weighted.length - 1].drill;
}

function pickWeightedCategory(themeWeights) {
  const total = Object.values(themeWeights).reduce((s, v) => s + v, 0);
  let r = Math.random() * total;
  for (const [cat, weight] of Object.entries(themeWeights)) {
    r -= weight;
    if (r <= 0) return cat;
  }
  return Object.keys(themeWeights)[0];
}

function getAIPracticeRequest() {
  return {
    theme: state.ui.genTheme || 'mixed',
    progression: state.ui.genProgression || 'balanced',
    duration: parseInt(document.getElementById('genDuration').value) || 60,
    avoidRecent: document.getElementById('genAvoidRecent').checked,
    ageGroup: document.getElementById('genAgeGroup')?.value || '10U',
    includeGoalie: document.getElementById('genIncludeGoalie')?.checked !== false,
    focus: document.getElementById('aiPracticeIntent')?.value || '',
    notes: document.getElementById('aiPracticeNotes')?.value || '',
  };
}

function setAIPracticeStatus(message, busy = false) {
  const status = document.getElementById('aiPracticeStatus');
  const btn = document.getElementById('aiPracticeBtn');
  if (status) status.textContent = message || '';
  if (btn) {
    btn.disabled = busy;
    btn.textContent = busy ? 'Building with AI…' : '🤖 AI BUILD PRACTICE';
  }
}

async function runAIPracticeBuilder() {
  const request = getAIPracticeRequest();
  if (!window.BearDenHQ?.buildAIPracticePlan) {
    toast('AI builder not ready');
    return;
  }
  setAIPracticeStatus('Building a practice from your drill library…', true);
  try {
    const plan = await window.BearDenHQ.buildAIPracticePlan(request, state);
    if (!plan?.blocks?.length) throw new Error('No practice blocks returned');
    state.currentPlan = plan;
    save();
    renderCurrentPlan();
    setTimeout(() => {
      document.getElementById('currentPlanBlocks').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    const source = plan.coachBrain?.source === 'ai-practice-builder' ? 'AI practice built' : 'Local fallback built';
    setAIPracticeStatus(`${source}: ${plan.blocks.length} blocks · ${plan.blocks.reduce((sum, block) => sum + (block.minutes || 0), 0)} minutes.`);
    window.BearDenHQ?.trackEvent?.("practice_generated", { source, blocks: plan.blocks.length, minutes: plan.blocks.reduce((sum, block) => sum + (block.minutes || 0), 0) });
    toast(source);
  } catch (err) {
    setAIPracticeStatus(err.message || 'AI builder failed.');
    toast('AI builder failed');
  } finally {
    const btn = document.getElementById('aiPracticeBtn');
    if (btn) { btn.disabled = false; btn.textContent = '🤖 AI BUILD PRACTICE'; }
  }
}

function renderAIPracticeSummary() {
  const panel = document.getElementById('aiPracticeSummaryPanel');
  const target = document.getElementById('aiPracticeSummary');
  if (!panel || !target) return;
  const summary = state.currentPlan?.coachBrain?.coachingSummary;
  if (!summary) {
    panel.style.display = 'none';
    target.innerHTML = '';
    return;
  }
  const cues = Array.isArray(summary.keyCues) ? summary.keyCues : [];
  const adjustments = Array.isArray(summary.adjustments) ? summary.adjustments : [];
  panel.style.display = 'block';
  target.innerHTML = `
    ${summary.whyThisPlanWorks ? `<div style="margin-bottom: 8px">${escapeHtml(summary.whyThisPlanWorks)}</div>` : ''}
    ${cues.length ? `<div style="margin-bottom: 6px"><strong>Key cues:</strong> ${cues.map(escapeHtml).join(' · ')}</div>` : ''}
    ${adjustments.length ? `<div><strong>Adjustments:</strong><ul style="margin: 6px 0 0 16px; padding: 0">${adjustments.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul></div>` : ''}
  `;
}

function runGenerator() {
  const theme = state.ui.genTheme || 'mixed';
  const progression = state.ui.genProgression || 'balanced';
  const duration = parseInt(document.getElementById('genDuration').value) || 55;
  const avoidRecent = document.getElementById('genAvoidRecent').checked;
  const ageGroup = document.getElementById('genAgeGroup')?.value || '10U';
  const includeGoalie = document.getElementById('genIncludeGoalie')?.checked !== false;

  if (!window.BearDenHQ?.generateCoachPlan) {
    toast('Planner not ready');
    return;
  }

  state.currentPlan = window.BearDenHQ.generateCoachPlan({ theme, duration, avoidRecent, progression, ageGroup, includeGoalie }, state);
  save();
  renderCurrentPlan();
  // Scroll down to the plan so user sees it
  setTimeout(() => {
    document.getElementById('currentPlanBlocks').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
  toast(`Generated ${duration}-min ${state.currentPlan.theme} practice`);
}

// ============================================
// ON-ICE MODE
// ============================================
let oiTimerInterval = null;
let oiDiagramPlayer = null;

function startOnIceMode() {
  if (window.BenchBossBench?.startBenchModeUI) {
    window.BenchBossBench.startBenchModeUI();
    return;
  }
  if ((!state.currentPlan.blocks || state.currentPlan.blocks.length === 0) && window.BenchBossBench?.hasOfflinePractice?.()) {
    try {
      window.BenchBossBench.loadOfflinePracticeIntoState(state);
      save();
      toast('Loaded preloaded offline practice');
    } catch (error) {
      toast(error.message || 'Offline practice could not be loaded');
    }
  }
  if (!state.currentPlan.blocks || state.currentPlan.blocks.length === 0) {
    toast('Add drills to the plan first');
    return;
  }
  window.BenchBossBench?.ensureBenchState?.(state);
  state.ui.oiIndex = 0;
  state.ui.oiPlan = JSON.parse(JSON.stringify(state.currentPlan));
  state.ui.oiTimerRunning = false;
  state.ui.oiTimerRemaining = 0;
  state.ui.oiStartedAt = new Date().toISOString();
  renderOnIceMode();
  const overlay = document.getElementById('oiOverlay');
  overlay.classList.add('show');
  overlay.classList.toggle('rink-contrast', state.benchMode?.rinkContrast !== false);
  document.body.classList.add('bench-active');
  window.BearDenHQ?.trackEvent?.('bench_mode_started', { blocks: state.ui.oiPlan.blocks.length, offlineReady: Boolean(state.benchMode?.offlineReady) });
  // Request wake lock if supported
  requestWakeLock();
}

function closeOnIceMode() {
  if (window.BenchBossBench?.closeBenchModeUI && document.getElementById('oiOverlay')?.classList.contains('bench-mode-overlay')) {
    window.BenchBossBench.closeBenchModeUI();
    return;
  }
  document.getElementById('oiOverlay').classList.remove('show');
  document.body.classList.remove('bench-active');
  if (oiTimerInterval) { clearInterval(oiTimerInterval); oiTimerInterval = null; }
  if (oiDiagramPlayer) { oiDiagramPlayer.stop(); oiDiagramPlayer = null; }
  state.ui.oiTimerRunning = false;
  releaseWakeLock();
}

let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { console.warn('Wake lock failed:', e); }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

function renderOnIceMode() {
  const plan = state.ui.oiPlan;
  if (!plan) return;
  const idx = state.ui.oiIndex;
  const total = plan.blocks.length;

  // Check if we're past the last drill (practice complete)
  if (idx >= total) {
    document.getElementById('oiProgress').textContent = 'PRACTICE COMPLETE';
    document.getElementById('oiProgressFill').style.width = '100%';
    const adjustments = state.benchMode?.adjustments?.length || 0;
    const notes = state.benchMode?.quickNotes?.length || 0;
    document.getElementById('oiBody').innerHTML = `
      <div class="oi-done">
        <div class="big-check">◆</div>
        <div class="msg">GOOD PRACTICE</div>
        <div class="sub">${escapeHtml(plan.title || 'Practice')} · ${plan.blocks.length} drills · ${plan.blocks.reduce((s, b) => s + b.minutes, 0)} min</div>
        <div class="oi-recap-card">
          <div class="oi-section-label">Quick Recap</div>
          <textarea id="oiRecapNotes" class="oi-recap-textarea" placeholder="What worked? What should be repeated or changed next practice?"></textarea>
          <div class="oi-recap-grid">
            <label><span>Rating</span><select id="oiRecapRating"><option value="5">5 - Great</option><option value="4">4 - Good</option><option value="3">3 - Mixed</option><option value="2">2 - Rough</option><option value="1">1 - Rebuild</option></select></label>
            <label><span>Next focus</span><input id="oiRecapFocus" placeholder="e.g. breakout support"></label>
          </div>
          <div class="oi-subtle">${adjustments} live adjustment${adjustments === 1 ? '' : 's'} · ${notes} bench note${notes === 1 ? '' : 's'}</div>
        </div>
        <div class="oi-done-actions">
          <button class="btn primary" onclick="oiSaveRecap()">Save Recap</button>
          <button class="btn" onclick="oiCopyLastRecap()">Copy Recap</button>
          <button class="btn" onclick="closeOnIceMode()">Close</button>
        </div>
      </div>
    `;
    document.getElementById('oiNav').style.display = 'none';
    return;
  }

  document.getElementById('oiNav').style.display = 'grid';
  const block = plan.blocks[idx];
  const drill = state.drills.find(d => d.id === block.drillId);
  if (!drill) {
    document.getElementById('oiBody').innerHTML = `<div class="empty-state" style="padding: 40px 20px; color: var(--loss)">Drill not found — it may have been deleted</div>`;
    return;
  }

  const category = CATEGORIES.find(c => c.id === drill.category);
  const pointsList = (drill.points || '').split('\n').filter(p => p.trim());
  const benchStatus = window.BenchBossBench?.getOfflineStatus?.(state) || { ready: false, online: navigator.onLine !== false };
  const lastAdjustment = state.benchMode?.lastAdjustment;

  document.getElementById('oiProgress').textContent = `DRILL ${idx + 1} / ${total}`;
  document.getElementById('oiProgressFill').style.width = `${((idx) / total) * 100}%`;
  const oiPlanTitle = document.getElementById('oiPlanTitle');
  if (oiPlanTitle) oiPlanTitle.textContent = `${plan.title || 'Bench Mode'} · ${benchStatus.ready ? 'Offline ready' : 'Not preloaded'} · ${benchStatus.online ? 'Online' : 'Offline'}`;

  // Reset timer for new drill if not running
  if (!state.ui.oiTimerRunning) {
    state.ui.oiTimerRemaining = block.minutes * 60;
  }

  document.getElementById('oiBody').innerHTML = `
    <div class="oi-rink-status">
      <span class="${benchStatus.online ? 'ok' : 'warn'}">${benchStatus.online ? 'Online' : 'Offline'}</span>
      <span class="${benchStatus.ready ? 'ok' : 'warn'}">${benchStatus.ready ? 'Preloaded' : 'Not preloaded'}</span>
      <span>${escapeHtml(drill.iceUsage || drill.diagram?.rink || 'rink ready')}</span>
    </div>
    <div class="oi-category">${escapeHtml(category?.label || '')} · ${block.minutes} min</div>
    <div class="oi-title">${escapeHtml(drill.name)}</div>
    ${block.label ? `<div style="font-size: 11px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px">${escapeHtml(block.label)}</div>` : ''}
    ${lastAdjustment?.changes?.length ? `<div class="oi-adjustment-note">Last adjustment: ${escapeHtml(lastAdjustment.label)} · ${lastAdjustment.changes.length} change${lastAdjustment.changes.length === 1 ? '' : 's'}</div>` : ''}
    <div class="oi-timer-display" id="oiTimerDisplay">
      <div class="oi-timer-time" id="oiTimerTime">${formatMMSS(state.ui.oiTimerRemaining)}</div>
      <div class="oi-timer-controls">
        <button class="oi-tbtn" onclick="oiResetTimer()">Reset</button>
        <button class="oi-tbtn" onclick="oiAddMinute()">+1:00</button>
        <button class="oi-tbtn" onclick="oiAddTwoMinutes()">+2:00</button>
      </div>
    </div>
    <div class="oi-bench-tools">
      <button onclick="oiSwapCurrentDrill()">Swap Drill</button>
      <button onclick="oiApplyPreset('half_ice')">Half Ice</button>
      <button onclick="oiApplyPreset('no_goalie')">No Goalies</button>
      <button onclick="oiApplyPreset('low_numbers')">Low Numbers</button>
      <button onclick="oiApplyPreset('compete_more')">Compete More</button>
      <button onclick="oiApplyPreset('simplify')">Simplify</button>
      <button onclick="oiApplyPreset('make_harder')">Harder</button>
      <button onclick="oiQuickNotePrompt()">+ Note</button>
    </div>
    ${drill.diagram ? `
      <div class="oi-section-label">Diagram</div>
      <canvas id="oiDiagramCanvas" class="oi-diagram-canvas"></canvas>
      <div class="oi-diagram-actions"><button class="oi-tbtn primary" id="oiPlayDiagramBtn">▶ Play Diagram</button><button class="oi-tbtn" onclick="oiToggleRinkMode()">${state.benchMode?.rinkContrast === false ? 'Rink Bright' : 'Dim Mode'}</button></div>
    ` : ''}
    ${block.objective ? `<div class="oi-section-label">Objective</div><div class="oi-desc">${escapeHtml(block.objective)}</div>` : ''}
    ${drill.description ? `
      <div class="oi-section-label">Setup & Flow</div>
      <div class="oi-desc">${escapeHtml(drill.description)}</div>
    ` : ''}
    ${pointsList.length > 0 ? `
      <div class="oi-section-label">Coaching Points</div>
      <div class="oi-points">
        ${pointsList.map(p => `<div class="oi-point">${escapeHtml(p)}</div>`).join('')}
      </div>
    ` : ''}
  `;

  if (oiDiagramPlayer) { oiDiagramPlayer.stop(); oiDiagramPlayer = null; }
  if (drill.diagram && window.BearDenHQ?.drawDrillDiagram) {
    window.BearDenHQ.drawDrillDiagram('oiDiagramCanvas', drill);
    const playBtn = document.getElementById('oiPlayDiagramBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (oiDiagramPlayer?.isPlaying?.()) {
          oiDiagramPlayer.pause();
          playBtn.textContent = '▶ Resume Diagram';
          return;
        }
        if (oiDiagramPlayer) {
          oiDiagramPlayer.resume?.();
          playBtn.textContent = '⏸ Pause Diagram';
          return;
        }
        oiDiagramPlayer = window.BearDenHQ.playDrillDiagram('oiDiagramCanvas', drill, {
          onStateChange: (status) => {
            if (status === 'paused') playBtn.textContent = '▶ Resume Diagram';
            if (status === 'playing') playBtn.textContent = '⏸ Pause Diagram';
          },
          onComplete: () => {
            playBtn.textContent = '▶ Play Diagram';
            oiDiagramPlayer = null;
          },
        });
        playBtn.textContent = '⏸ Pause Diagram';
      });
    }
  }

  // Update nav buttons
  document.getElementById('oiPrev').disabled = idx === 0;
  document.getElementById('oiNext').textContent = (idx === total - 1) ? 'Finish ▶' : 'Next ▶';
  updateTimerButton();
}

function oiPrev() {
  if (state.ui.oiIndex > 0) {
    state.ui.oiIndex--;
    if (oiDiagramPlayer) { oiDiagramPlayer.stop(); oiDiagramPlayer = null; }
    oiStopTimer();
    state.ui.oiTimerRemaining = 0;
    renderOnIceMode();
  }
}

function oiNext() {
  if (oiDiagramPlayer) { oiDiagramPlayer.stop(); oiDiagramPlayer = null; }
  state.ui.oiIndex++;
  oiStopTimer();
  state.ui.oiTimerRemaining = 0;
  renderOnIceMode();
}

function oiToggleTimer() {
  if (state.ui.oiTimerRunning) oiStopTimer();
  else oiStartTimer();
  updateTimerButton();
}

function oiStartTimer() {
  if (state.ui.oiTimerRemaining <= 0) {
    const block = state.ui.oiPlan?.blocks[state.ui.oiIndex];
    if (block) state.ui.oiTimerRemaining = block.minutes * 60;
  }
  state.ui.oiTimerRunning = true;
  state.ui.oiTimerStartTime = Date.now();
  const startVal = state.ui.oiTimerRemaining;
  if (oiTimerInterval) clearInterval(oiTimerInterval);
  oiTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.ui.oiTimerStartTime) / 1000);
    state.ui.oiTimerRemaining = startVal - elapsed;
    const timeEl = document.getElementById('oiTimerTime');
    const dispEl = document.getElementById('oiTimerDisplay');
    if (!timeEl) { oiStopTimer(); return; }
    if (state.ui.oiTimerRemaining <= 0) {
      timeEl.textContent = '0:00';
      dispEl.classList.remove('running');
      dispEl.classList.add('done');
      oiStopTimer();
      updateTimerButton();
      try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
      return;
    }
    timeEl.textContent = formatMMSS(state.ui.oiTimerRemaining);
    dispEl.classList.add('running');
    dispEl.classList.remove('done');
  }, 200);
}

function oiStopTimer() {
  state.ui.oiTimerRunning = false;
  if (oiTimerInterval) { clearInterval(oiTimerInterval); oiTimerInterval = null; }
  const dispEl = document.getElementById('oiTimerDisplay');
  if (dispEl) dispEl.classList.remove('running');
}

function oiResetTimer() {
  oiStopTimer();
  const block = state.ui.oiPlan?.blocks[state.ui.oiIndex];
  if (block) state.ui.oiTimerRemaining = block.minutes * 60;
  const dispEl = document.getElementById('oiTimerDisplay');
  if (dispEl) dispEl.classList.remove('done');
  const timeEl = document.getElementById('oiTimerTime');
  if (timeEl) timeEl.textContent = formatMMSS(state.ui.oiTimerRemaining);
  updateTimerButton();
}

function oiAddMinute() {
  state.ui.oiTimerRemaining += 60;
  if (state.ui.oiTimerRunning) {
    // Adjust start time so the running timer reflects the bump
    state.ui.oiTimerStartTime += 60 * 1000;
  }
  const dispEl = document.getElementById('oiTimerDisplay');
  if (dispEl) dispEl.classList.remove('done');
  const timeEl = document.getElementById('oiTimerTime');
  if (timeEl) timeEl.textContent = formatMMSS(state.ui.oiTimerRemaining);
}

function oiAddTwoMinutes() {
  oiAddMinute();
  oiAddMinute();
}

function oiApplyPreset(preset) {
  if (!window.BenchBossBench?.applyPresetToBenchPlan) { toast('Bench adjustments not ready'); return; }
  const result = window.BenchBossBench.applyPresetToBenchPlan(state, preset, false);
  save();
  if (result.changes.length === 0) toast('Current plan already fits that adjustment');
  else toast(`${result.changes.length} drill${result.changes.length === 1 ? '' : 's'} adjusted`);
  renderOnIceMode();
}

function oiSwapCurrentDrill() {
  if (!window.BenchBossBench?.applyPresetToBenchPlan) { toast('Bench adjustments not ready'); return; }
  const result = window.BenchBossBench.applyPresetToBenchPlan(state, 'swap_current', true);
  save();
  if (result.changes.length === 0) toast('No strong replacement found');
  else toast(`Swapped to ${result.changes[0].to}`);
  renderOnIceMode();
}

function oiQuickNotePrompt() {
  const block = state.ui.oiPlan?.blocks?.[state.ui.oiIndex];
  const note = prompt('Bench note for this drill:', '');
  if (!note) return;
  window.BenchBossBench?.addQuickNote?.(state, note, block);
  save();
  toast('Bench note saved');
}

function oiToggleRinkMode() {
  window.BenchBossBench?.ensureBenchState?.(state);
  state.benchMode.rinkContrast = state.benchMode.rinkContrast === false;
  document.getElementById('oiOverlay')?.classList.toggle('rink-contrast', state.benchMode.rinkContrast !== false);
  save();
  renderOnIceMode();
}

function oiSaveRecap() {
  if (!window.BenchBossBench?.saveBenchRecap) { toast('Bench recap not ready'); return; }
  const recap = window.BenchBossBench.saveBenchRecap(state, {
    notes: document.getElementById('oiRecapNotes')?.value || '',
    rating: document.getElementById('oiRecapRating')?.value || '',
    focus: document.getElementById('oiRecapFocus')?.value || '',
  });
  state.currentPlan = JSON.parse(JSON.stringify(state.ui.oiPlan || state.currentPlan));
  if (window.BearDenHQ?.completePracticePlan) {
    try { window.BearDenHQ.completePracticePlan(state.currentPlan, state); } catch (error) { console.warn('Completion tracking failed:', error); }
  }
  save();
  toast('Practice recap saved');
  window.BearDenHQ?.trackEvent?.('bench_recap_saved', { rating: recap.rating, notes: Boolean(recap.notes) });
}

async function oiCopyLastRecap() {
  const recap = state.benchMode?.lastRecap;
  if (!recap) { toast('Save recap first'); return; }
  try {
    await navigator.clipboard.writeText(recap.shareText || window.BenchBossBench.buildRecapText(recap));
    toast('Recap copied');
  } catch (error) {
    toast('Copy failed');
  }
}

async function preloadCurrentPracticeOffline() {
  if (!window.BenchBossBench?.preloadCurrentPracticeForOffline) { toast('Offline preload not ready'); return; }
  const statusEl = document.getElementById('benchReadiness');
  if (statusEl) statusEl.innerHTML = '<strong>Preloading rink pack…</strong><span>Caching current practice, drill animations, and app shell.</span>';
  try {
    const result = await window.BenchBossBench.preloadCurrentPracticeForOffline(state);
    save();
    renderBenchReadiness();
    toast(`Offline pack ready: ${result.bundle.drills.length} drills`);
    window.BearDenHQ?.trackEvent?.('bench_offline_preloaded', { drills: result.bundle.drills.length, cached: result.cacheResult.cached });
  } catch (error) {
    renderBenchReadiness(error.message || 'Offline preload failed', true);
    toast(error.message || 'Offline preload failed');
  }
}

function loadPreloadedOfflinePractice() {
  if (!window.BenchBossBench?.loadOfflinePracticeIntoState) { toast('Offline load not ready'); return; }
  try {
    const bundle = window.BenchBossBench.loadOfflinePracticeIntoState(state);
    save();
    renderCurrentPlan();
    toast(`Loaded offline practice: ${bundle.plan.title || 'Practice'}`);
  } catch (error) {
    toast(error.message || 'No offline practice found');
  }
}

function clearPreloadedOfflinePractice() {
  if (!window.BenchBossBench?.clearOfflinePractice) return;
  if (!confirm('Clear the preloaded rink practice from this device?')) return;
  window.BenchBossBench.clearOfflinePractice(state);
  save();
  renderBenchReadiness();
  toast('Offline rink pack cleared');
}

function applyBenchPresetToCurrentPlan(preset) {
  if (!window.BenchBossBench?.applyBenchPreset) { toast('Bench adjustments not ready'); return; }
  const result = window.BenchBossBench.applyBenchPreset(state.currentPlan, state, preset, {});
  state.currentPlan = result.plan;
  if (window.BenchBossBench.ensureBenchState) window.BenchBossBench.ensureBenchState(state);
  state.benchMode.lastAdjustment = { at: new Date().toISOString(), preset, label: window.BenchBossBench.PRESET_LABELS[preset] || preset, changes: result.changes };
  state.benchMode.adjustments.unshift(state.benchMode.lastAdjustment);
  save();
  renderCurrentPlan();
  toast(result.changes.length ? `${result.changes.length} drills adjusted` : 'Plan already fits that preset');
}

function renderBenchReadiness(message = null, isError = false) {
  const el = document.getElementById('benchReadiness');
  if (!el) return;
  const status = window.BenchBossBench?.getOfflineStatus?.(state) || { ready: false, online: navigator.onLine !== false };
  const saved = status.preloadedAt ? new Date(status.preloadedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not preloaded';
  const title = status.planTitle || 'No rink pack on this device';
  const cls = isError ? 'danger' : status.ready ? 'ready' : 'warn';
  el.className = `bench-readiness ${cls}`;
  el.innerHTML = `
    <div>
      <strong>${escapeHtml(message || (status.ready ? 'Rink pack ready' : 'Rink pack not ready'))}</strong>
      <span>${escapeHtml(title)} · ${status.blockCount || 0} blocks · ${status.drillCount || 0} drills · ${saved}</span>
    </div>
    <div class="bench-status-pill ${status.online ? 'online' : 'offline'}">${status.online ? 'Online' : 'Offline'}</div>
  `;
}

function updateTimerButton() {
  const btn = document.getElementById('oiTimerBtn');
  if (!btn) return;
  btn.textContent = state.ui.oiTimerRunning ? '⏸ Pause' : '▶ Start Timer';
}

function formatMMSS(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Swipe handling for on-ice mode
let oiSwipeStartX = 0;
document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('oiBody');
  if (body) {
    body.addEventListener('touchstart', (e) => { oiSwipeStartX = e.touches[0].clientX; }, { passive: true });
    body.addEventListener('touchend', (e) => {
      if (!document.getElementById('oiOverlay').classList.contains('show')) return;
      const dx = e.changedTouches[0].clientX - oiSwipeStartX;
      if (Math.abs(dx) > 60) {
        if (dx < 0) oiNext();
        else oiPrev();
      }
    }, { passive: true });
  }
});

