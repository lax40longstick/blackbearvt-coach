// BenchBoss Coach HQ v0.9.0 — Club Director data store
// -----------------------------------------------------------------------------
// Supabase-backed read layer for the multi-team director dashboard.
// Requires the `club` plan and a director/owner membership at the org level.
//
// Reads from existing tables (no schema migration required):
//   - organizations, subscriptions, teams, memberships, team_practices,
//     team_announcements, team_lineups, team_published_drills
//
// All queries assume Supabase RLS will scope rows to the user's organization.
// If RLS is not yet enabled (see README warning), this still works correctly
// because we filter by organization_id explicitly in every query.

import { getSupabaseClient, getSupabaseStatus } from '../../lib/supabase.js';
import { getTenantContext } from '../teams/team-context.js';

const DIRECTOR_ROLES = ['owner', 'director'];
const ACTIVITY_WINDOW_DAYS = 30;
const DORMANT_WINDOW_DAYS = 14;

function asArray(value) { return Array.isArray(value) ? value : []; }
function nowIso() { return new Date().toISOString(); }
function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getDirectorContext() {
  const status = getSupabaseStatus();
  if (!status.ready) {
    return { ready: false, status, error: status.message, supabase: null, organization: null, role: null };
  }
  try {
    const supabase = await getSupabaseClient();
    const context = await getTenantContext();
    const organization = context.primaryOrganization || null;
    const membership = context.primaryMembership || null;
    const role = membership?.role || null;
    const isDirector = DIRECTOR_ROLES.includes(role);
    const isClubPlan = (organization?.plan === 'club');

    return {
      ready: Boolean(context.user && organization && isDirector && isClubPlan),
      status,
      supabase,
      user: context.user || null,
      organization,
      membership,
      role,
      isDirector,
      isClubPlan,
      error: !context.user
        ? 'Sign in to access the director dashboard'
        : !organization
          ? 'No organization is associated with this account yet'
          : !isClubPlan
            ? 'The director dashboard is part of the Club plan. Upgrade to unlock multi-team views.'
            : !isDirector
              ? 'Director role required. Ask the organization owner to grant director access.'
              : null,
    };
  } catch (error) {
    return { ready: false, status, error: error?.message || 'Failed to load director context', supabase: null, organization: null, role: null };
  }
}

/**
 * Loads the full director dashboard payload in one batch.
 * Returns a structured object the UI can render against without further fetches.
 */
export async function loadClubDashboardData(supabase, orgId) {
  if (!supabase || !orgId) return emptyDashboard();
  const activitySince = daysAgoIso(ACTIVITY_WINDOW_DAYS);
  const dormantThreshold = daysAgoIso(DORMANT_WINDOW_DAYS);

  const [
    { data: org, error: orgError },
    { data: subRow },
    { data: teams, error: teamsError },
    { data: memberships },
    { data: recentPractices },
    { data: lineups },
    { data: announcements },
  ] = await Promise.all([
    supabase.from('organizations').select('id, name, slug, plan, subscription_status, trial_ends_at').eq('id', orgId).maybeSingle(),
    supabase.from('subscriptions').select('plan, status, billing_interval, current_period_end, cancel_at, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('teams').select('id, name, slug, age_group, season_label, created_at, updated_at').eq('organization_id', orgId).order('name'),
    supabase.from('memberships').select('id, team_id, user_id, role, status, created_at').eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('team_practices').select('id, team_id, title, practice_date, status, created_at, updated_at').eq('organization_id', orgId).gte('updated_at', activitySince).order('updated_at', { ascending: false }).limit(200),
    supabase.from('team_lineups').select('team_id, updated_at').eq('organization_id', orgId).order('updated_at', { ascending: false }).limit(50),
    supabase.from('team_announcements').select('team_id, updated_at, title').eq('organization_id', orgId).order('updated_at', { ascending: false }).limit(50),
  ]);

  if (orgError) throw orgError;
  if (teamsError) throw teamsError;

  return {
    organization: org || null,
    subscription: subRow || null,
    teams: asArray(teams),
    memberships: asArray(memberships),
    recentPractices: asArray(recentPractices),
    lineups: asArray(lineups),
    announcements: asArray(announcements),
    activitySince,
    dormantThreshold,
    activityWindowDays: ACTIVITY_WINDOW_DAYS,
    dormantWindowDays: DORMANT_WINDOW_DAYS,
  };
}

function emptyDashboard() {
  return {
    organization: null,
    subscription: null,
    teams: [],
    memberships: [],
    recentPractices: [],
    lineups: [],
    announcements: [],
    activitySince: daysAgoIso(ACTIVITY_WINDOW_DAYS),
    dormantThreshold: daysAgoIso(DORMANT_WINDOW_DAYS),
    activityWindowDays: ACTIVITY_WINDOW_DAYS,
    dormantWindowDays: DORMANT_WINDOW_DAYS,
  };
}

/**
 * Aggregates the raw payload into per-team summary rows + org KPIs.
 * Pure function — no Supabase calls. Test-friendly.
 */
export function buildClubSummary(data) {
  const teams = asArray(data.teams);
  const memberships = asArray(data.memberships);
  const practices = asArray(data.recentPractices);
  const lineups = asArray(data.lineups);
  const announcements = asArray(data.announcements);
  const dormantThreshold = data.dormantThreshold;

  // Index lookups
  const coachesByTeam = new Map();
  const lastLineupByTeam = new Map();
  const lastAnnouncementByTeam = new Map();
  const teamPractices = new Map();
  const lastPracticeByTeam = new Map();

  for (const m of memberships) {
    if (!m.team_id) continue;
    const list = coachesByTeam.get(m.team_id) || [];
    list.push(m);
    coachesByTeam.set(m.team_id, list);
  }
  for (const lineup of lineups) {
    const prev = lastLineupByTeam.get(lineup.team_id);
    if (!prev || lineup.updated_at > prev) lastLineupByTeam.set(lineup.team_id, lineup.updated_at);
  }
  for (const ann of announcements) {
    const prev = lastAnnouncementByTeam.get(ann.team_id);
    if (!prev || ann.updated_at > prev) lastAnnouncementByTeam.set(ann.team_id, ann.updated_at);
  }
  for (const p of practices) {
    const list = teamPractices.get(p.team_id) || [];
    list.push(p);
    teamPractices.set(p.team_id, list);
    const prev = lastPracticeByTeam.get(p.team_id);
    if (!prev || p.updated_at > prev) lastPracticeByTeam.set(p.team_id, p.updated_at);
  }

  const teamRows = teams.map(team => {
    const teamCoaches = coachesByTeam.get(team.id) || [];
    const headCoaches = teamCoaches.filter(m => m.role === 'head_coach').length;
    const assistants = teamCoaches.filter(m => m.role === 'assistant_coach').length;
    const managers = teamCoaches.filter(m => m.role === 'manager').length;
    const lastPractice = lastPracticeByTeam.get(team.id) || null;
    const lastLineup = lastLineupByTeam.get(team.id) || null;
    const lastAnnouncement = lastAnnouncementByTeam.get(team.id) || null;
    const practiceCount30d = (teamPractices.get(team.id) || []).length;
    const status = computeTeamStatus({ lastPractice, headCoaches, dormantThreshold });

    return {
      id: team.id,
      name: team.name,
      ageGroup: team.age_group || '',
      seasonLabel: team.season_label || '',
      headCoaches,
      assistants,
      managers,
      coachCount: teamCoaches.length,
      practiceCount30d,
      lastPractice,
      lastLineup,
      lastAnnouncement,
      status,
    };
  });

  // KPI roll-up
  const totalTeams = teamRows.length;
  const activeTeams = teamRows.filter(t => t.status === 'active').length;
  const dormantTeams = teamRows.filter(t => t.status === 'dormant').length;
  const setupTeams = teamRows.filter(t => t.status === 'setup').length;
  const totalCoaches = memberships.filter(m => ['owner', 'head_coach', 'assistant_coach', 'director'].includes(m.role)).length;
  const totalPractices30d = practices.length;
  const teamsWithoutHeadCoach = teamRows.filter(t => t.headCoaches === 0).length;

  return {
    teamRows,
    kpis: {
      totalTeams,
      activeTeams,
      dormantTeams,
      setupTeams,
      totalCoaches,
      totalPractices30d,
      teamsWithoutHeadCoach,
      activityWindowDays: data.activityWindowDays,
    },
    organization: data.organization,
    subscription: data.subscription,
  };
}

function computeTeamStatus({ lastPractice, headCoaches, dormantThreshold }) {
  if (headCoaches === 0) return 'setup';
  if (!lastPractice) return 'setup';
  if (lastPractice < dormantThreshold) return 'dormant';
  return 'active';
}

/**
 * Pushes a templated practice plan into one or more teams.
 * Each push creates a draft row in `team_practices` with `data` set to the template.
 * Director must own/direct the org. Returns { successCount, failures: [...] }.
 */
export async function pushPracticeTemplate(supabase, { orgId, teamIds, title, planData, createdBy }) {
  if (!supabase) throw new Error('Supabase client not ready');
  if (!orgId) throw new Error('orgId required');
  if (!Array.isArray(teamIds) || teamIds.length === 0) throw new Error('teamIds required');
  if (!title) throw new Error('title required');

  const rows = teamIds.map(teamId => ({
    organization_id: orgId,
    team_id: teamId,
    title: String(title).slice(0, 200),
    status: 'draft',
    visibility: 'coaches',
    data: planData || {},
    created_by: createdBy || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }));

  const { data, error } = await supabase.from('team_practices').insert(rows).select('id, team_id');
  if (error) {
    return { successCount: 0, inserted: [], failures: [{ error: error.message, teamIds }] };
  }
  return { successCount: asArray(data).length, inserted: asArray(data), failures: [] };
}

export const __test__ = { computeTeamStatus, buildClubSummary };
