// BenchBoss Coach HQ v0.6.0 — Production Team Hub store
// Supabase-backed persistence for roster, lineups, published practices, branding,
// invites, external source links, and parent portal data.

import { getSupabaseClient, getSupabaseStatus } from '../../lib/supabase.js';
import { getTenantContext } from '../teams/team-context.js';

const TEAM_ROLES = Object.freeze({
  MANAGE: ['owner', 'director', 'head_coach', 'manager'],
  COACH: ['owner', 'director', 'head_coach', 'assistant_coach'],
  VIEW: ['owner', 'director', 'head_coach', 'assistant_coach', 'manager', 'parent', 'player', 'viewer'],
});

function asArray(value) { return Array.isArray(value) ? value : []; }
function clean(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
function normalizeNumber(value) { return clean(value, 8) || ''; }
function nowIso() { return new Date().toISOString(); }

function splitName(displayName) {
  const name = clean(displayName, 160).replace(/\s+/g, ' ');
  if (!name) return { firstName: '', lastName: '', displayName: 'Unknown Player' };
  if (name.includes(',')) {
    const [last, first] = name.split(',').map(part => clean(part, 80));
    const display = [first, last].filter(Boolean).join(' ') || name;
    return { firstName: first || '', lastName: last || '', displayName: display };
  }
  const parts = name.split(' ');
  if (parts.length === 1) return { firstName: '', lastName: parts[0], displayName: name };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1), displayName: name };
}

function roleCan(role, allowed) {
  return allowed.includes(role || '');
}

export async function getProductionTeamContext() {
  const status = getSupabaseStatus();
  if (!status.ready) {
    return { ready: false, status, error: status.message, supabase: null, context: null, team: null, organization: null, membership: null, role: null };
  }
  try {
    const supabase = await getSupabaseClient();
    const context = await getTenantContext();
    const team = context.primaryTeam || null;
    const organization = context.primaryOrganization || null;
    const membership = context.primaryMembership || null;
    return {
      ready: Boolean(context.user && team && organization && membership),
      status,
      supabase,
      context,
      user: context.user || null,
      team,
      organization,
      membership,
      role: membership?.role || null,
      canManage: roleCan(membership?.role, TEAM_ROLES.MANAGE),
      canCoach: roleCan(membership?.role, TEAM_ROLES.COACH),
      canView: roleCan(membership?.role, TEAM_ROLES.VIEW),
      error: context.user ? null : 'Sign in to use Production Team Hub',
    };
  } catch (error) {
    return { ready: false, status, error: error.message || String(error), supabase: null, context: null, team: null, organization: null, membership: null, role: null };
  }
}

function requireTeam(ctx) {
  if (!ctx?.ready || !ctx.team?.id || !ctx.organization?.id) {
    throw new Error(ctx?.error || 'Production team context is not ready. Check Supabase setup and workspace membership.');
  }
}

function toPlayerRow(ctx, player) {
  const name = splitName(player.name || player.display_name || player.displayName || '');
  const metadata = {
    localId: player.id || null,
    source: player.source || 'benchboss-local',
    importedAt: player.importedAt || null,
  };
  return {
    organization_id: ctx.organization.id,
    team_id: ctx.team.id,
    source_player_id: clean(player.id, 80) || null,
    jersey_number: normalizeNumber(player.num || player.jersey_number || player.number),
    first_name: name.firstName,
    last_name: name.lastName,
    display_name: name.displayName,
    dob: clean(player.dob, 40) || null,
    position: ['F','D','G','F/D','NA'].includes(player.pos || player.position) ? (player.pos || player.position) : 'F',
    active: player.active !== false,
    metadata,
    created_by: ctx.user?.id || null,
  };
}

function fromPlayerRow(row) {
  return {
    id: row.source_player_id || row.id,
    productionId: row.id,
    num: row.jersey_number || '',
    name: row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' '),
    dob: row.dob || '',
    pos: row.position || 'F',
    source: row.metadata?.source || 'supabase',
  };
}

export async function loadProductionTeamHubData() {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  const { supabase, team } = ctx;
  const fullAccess = Boolean(ctx.canCoach || ctx.canManage);
  const playerSource = fullAccess ? 'team_players' : 'team_player_public_cards';
  const sourceLinkSource = fullAccess ? 'team_sources' : 'team_public_source_links';

  const [players, staff, practices, lineups, sources, imports, announcements] = await Promise.all([
    supabase.from(playerSource).select('*').eq('team_id', team.id).eq('active', true).order('jersey_number', { ascending: true }),
    supabase.from('team_staff').select('*').eq('team_id', team.id).order('title', { ascending: true }),
    supabase.from('team_practices').select('*').eq('team_id', team.id).order('practice_date', { ascending: false }).limit(20),
    supabase.from('team_lineups').select('*').eq('team_id', team.id).order('game_date', { ascending: false }).limit(20),
    supabase.from(sourceLinkSource).select('*').eq('team_id', team.id).order('source_type', { ascending: true }),
    supabase.from('gamesheet_import_runs').select('*').eq('team_id', team.id).order('imported_at', { ascending: false }).limit(10),
    supabase.from('team_announcements').select('*').eq('team_id', team.id).order('published_at', { ascending: false }).limit(20),
  ]);

  const errors = [players, staff, practices, lineups, sources, imports, announcements].map(r => r.error).filter(Boolean);
  if (errors.length) throw new Error(errors[0].message || 'Could not load team hub data');

  return {
    ctx,
    players: players.data || [],
    staff: staff.data || [],
    practices: practices.data || [],
    lineups: lineups.data || [],
    sources: sources.data || [],
    imports: imports.data || [],
    announcements: announcements.data || [],
  };
}

export async function pullRosterFromSupabaseIntoState(state) {
  const data = await loadProductionTeamHubData();
  if (data.players.length) {
    state.roster = data.players.map(fromPlayerRow);
    state.teamHub = state.teamHub || {};
    state.teamHub.lastProductionPullAt = nowIso();
  }
  return { count: data.players.length, data };
}

export async function syncRosterToSupabase(state) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canManage) throw new Error('Only owners, head coaches, directors, and managers can sync roster data.');

  const roster = asArray(state?.roster).filter(p => clean(p.name || p.display_name));
  if (!roster.length) throw new Error('No roster players to sync.');

  const rows = roster.map(player => toPlayerRow(ctx, player));
  const { data, error } = await ctx.supabase
    .from('team_players')
    .upsert(rows, { onConflict: 'team_id,jersey_number,display_name' })
    .select('*');
  if (error) throw error;

  state.teamHub = state.teamHub || {};
  state.teamHub.lastRosterProductionSyncAt = nowIso();
  return { count: data?.length || rows.length, rows: data || [] };
}

function buildLineupPayload(state, status = 'draft') {
  const opponent = clean(state?.gameDay?.opponent, 160) || 'Opponent TBD';
  const gameDate = clean(state?.gameDay?.date, 20) || new Date().toISOString().slice(0, 10);
  return {
    game_label: `${state?.gameDay?.homeAway === 'A' ? '@' : 'vs'} ${opponent}`,
    opponent,
    game_date: gameDate,
    status,
    visibility: status === 'published' ? 'team' : 'coaches',
    data: {
      lines: state?.lines || {},
      gameDay: state?.gameDay || {},
      scratches: state?.teamHub?.lineupBuilder?.scratches || [],
      absent: state?.teamHub?.lineupBuilder?.absent || [],
      injured: state?.teamHub?.lineupBuilder?.injured || [],
      rosterSnapshot: asArray(state?.roster).map(p => ({ id: p.id, num: p.num, name: p.name, pos: p.pos })),
      generatedAt: nowIso(),
      source: 'benchboss-app',
    },
  };
}

export async function saveLineupToSupabase(state, { publish = false } = {}) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canCoach) throw new Error('Only coaches can save/publish lineups.');

  const payload = buildLineupPayload(state, publish ? 'published' : 'draft');
  const row = {
    organization_id: ctx.organization.id,
    team_id: ctx.team.id,
    ...payload,
    published_at: publish ? nowIso() : null,
    created_by: ctx.user?.id || null,
  };

  const { data, error } = await ctx.supabase.from('team_lineups').insert(row).select('*').single();
  if (error) throw error;
  state.teamHub = state.teamHub || {};
  state.teamHub.lastLineupProductionSyncAt = nowIso();
  return data;
}

function currentPracticeToRow(ctx, state, status = 'published') {
  const plan = state?.currentPlan || {};
  return {
    organization_id: ctx.organization.id,
    team_id: ctx.team.id,
    title: clean(plan.title, 160) || 'Published Practice',
    practice_date: clean(plan.date, 20) || new Date().toISOString().slice(0, 10),
    status,
    visibility: status === 'published' ? 'team' : 'coaches',
    data: {
      ...plan,
      blocks: asArray(plan.blocks),
      publishedFrom: 'benchboss-app',
      publishedAt: nowIso(),
    },
    published_at: status === 'published' ? nowIso() : null,
    created_by: ctx.user?.id || null,
  };
}

export async function publishCurrentPracticeToSupabase(state) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canCoach) throw new Error('Only coaches can publish practices.');
  const plan = state?.currentPlan || {};
  const blocks = asArray(plan.blocks);
  if (!blocks.length) throw new Error('Current practice has no blocks to publish.');

  const { data: practice, error } = await ctx.supabase.from('team_practices').insert(currentPracticeToRow(ctx, state, 'published')).select('*').single();
  if (error) throw error;

  const drillRows = blocks.map(block => {
    const drill = asArray(state.drills).find(d => d.id === block.drillId) || {};
    return {
      organization_id: ctx.organization.id,
      team_id: ctx.team.id,
      practice_id: practice.id,
      drill_id: block.drillId || drill.id || null,
      title: clean(drill.name || block.label || 'Practice Drill', 160),
      category: clean(drill.category || block.category || '', 80) || null,
      data: { block, drill },
      status: 'published',
      published_at: nowIso(),
      created_by: ctx.user?.id || null,
    };
  });
  if (drillRows.length) {
    const { error: drillError } = await ctx.supabase.from('team_published_drills').insert(drillRows);
    if (drillError) throw drillError;
  }
  state.teamHub = state.teamHub || {};
  state.teamHub.lastPracticeProductionPublishAt = nowIso();
  return { practice, drillCount: drillRows.length };
}

export async function saveTeamBrandingToSupabase(state) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canManage) throw new Error('Only owners, head coaches, directors, and managers can save team branding.');
  const brand = state?.teamBranding || {};
  const update = {
    brand_product_name: clean(brand.productName, 120) || 'BenchBoss Coach HQ',
    brand_short_name: clean(brand.shortName, 40) || 'BenchBoss',
    brand_primary_color: clean(brand.primaryColor, 20) || '#7dd3d8',
    brand_secondary_color: clean(brand.secondaryColor, 20) || '#f4cf57',
    brand_accent_color: clean(brand.accentColor, 20) || '#4ad9a8',
    brand_background_color: clean(brand.backgroundColor, 20) || '#0a0a0a',
    brand_monogram: clean(brand.monogram, 8) || 'BB',
  };
  if (brand.logoUrl) update.logo_url = brand.logoUrl;
  const { data, error } = await ctx.supabase.from('teams').update(update).eq('id', ctx.team.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function uploadTeamLogoToSupabase(file, state) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canManage) throw new Error('Only managers/coaches can upload logos.');
  if (!file || !file.type?.startsWith('image/')) throw new Error('Choose a PNG, JPG, SVG, or WebP logo file.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Logo must be under 2MB for production upload.');
  const extension = (file.name.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const path = `${ctx.team.id}/logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await ctx.supabase.storage.from('team-logos').upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadError) throw uploadError;
  const { data: urlData } = ctx.supabase.storage.from('team-logos').getPublicUrl(path);
  const logoUrl = urlData?.publicUrl || '';
  state.teamBranding = { ...(state.teamBranding || {}), logoUrl, logoDataUrl: logoUrl };
  await saveTeamBrandingToSupabase(state);
  return logoUrl;
}

export async function loadTeamBrandingFromSupabase(state) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  const { data, error } = await ctx.supabase
    .from('teams')
    .select('name, brand_product_name, brand_short_name, brand_primary_color, brand_secondary_color, brand_accent_color, brand_background_color, brand_monogram, logo_url')
    .eq('id', ctx.team.id)
    .single();
  if (error) throw error;
  state.teamBranding = {
    ...(state.teamBranding || {}),
    productName: data.brand_product_name || 'BenchBoss Coach HQ',
    shortName: data.brand_short_name || 'BenchBoss',
    teamName: data.name || state.teamBranding?.teamName || '',
    primaryColor: data.brand_primary_color || '#7dd3d8',
    secondaryColor: data.brand_secondary_color || '#f4cf57',
    accentColor: data.brand_accent_color || '#4ad9a8',
    backgroundColor: data.brand_background_color || '#0a0a0a',
    monogram: data.brand_monogram || 'BB',
    logoUrl: data.logo_url || '',
    logoDataUrl: data.logo_url || state.teamBranding?.logoDataUrl || '',
  };
  return state.teamBranding;
}

export async function saveTeamSourceLinks(links = {}) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canManage) throw new Error('Only managers/coaches can change source links.');
  const rows = [];
  if (links.gamesheetUrl) rows.push({ source_type: 'gamesheet', label: 'GameSheet Stats', url: clean(links.gamesheetUrl, 800), external_id: clean(links.gamesheetExternalId, 80) || 'primary' });
  if (links.sportsEngineRosterUrl) rows.push({ source_type: 'sportsengine', label: 'SportsEngine Roster', url: clean(links.sportsEngineRosterUrl, 800), external_id: 'roster' });
  if (links.sportsEngineChatUrl) rows.push({ source_type: 'sportsengine', label: 'SportsEngine Chat', url: clean(links.sportsEngineChatUrl, 800), external_id: 'chat' });
  if (links.sportsEngineScheduleUrl) rows.push({ source_type: 'sportsengine', label: 'SportsEngine Schedule', url: clean(links.sportsEngineScheduleUrl, 800), external_id: 'schedule' });
  if (!rows.length) return [];
  const withContext = rows.map(row => ({
    organization_id: ctx.organization.id,
    team_id: ctx.team.id,
    ...row,
    enabled: true,
    settings: {},
    created_by: ctx.user?.id || null,
  }));
  const { data, error } = await ctx.supabase.from('team_sources').upsert(withContext, { onConflict: 'team_id,source_type,external_id' }).select('*');
  if (error) throw error;
  return data || [];
}

export async function createTeamInvite({ email = '', role = 'parent' } = {}) {
  const ctx = await getProductionTeamContext();
  requireTeam(ctx);
  if (!ctx.canManage) throw new Error('Only managers/coaches can create invites.');
  const { data: sessionData } = await ctx.supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Missing signed-in Supabase session.');
  const res = await fetch('/api/create-team-invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ teamId: ctx.team.id, organizationId: ctx.organization.id, email, role }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not create invite');
  return body;
}

export async function acceptTeamInvite(tokenValue) {
  const ctx = await getProductionTeamContext();
  if (!ctx.supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData } = await ctx.supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Sign in before accepting the invite.');
  const res = await fetch('/api/accept-team-invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ token: tokenValue }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not accept invite');
  return body;
}

export function summarizeProductionData(data) {
  return {
    players: data?.players?.length || 0,
    staff: data?.staff?.length || 0,
    practices: data?.practices?.length || 0,
    lineups: data?.lineups?.length || 0,
    sources: data?.sources?.length || 0,
    imports: data?.imports?.length || 0,
    announcements: data?.announcements?.length || 0,
  };
}

window.BenchBossProductionStore = {
  getProductionTeamContext,
  loadProductionTeamHubData,
  pullRosterFromSupabaseIntoState,
  syncRosterToSupabase,
  saveLineupToSupabase,
  publishCurrentPracticeToSupabase,
  saveTeamBrandingToSupabase,
  uploadTeamLogoToSupabase,
  loadTeamBrandingFromSupabase,
  saveTeamSourceLinks,
  createTeamInvite,
  acceptTeamInvite,
  summarizeProductionData,
};
