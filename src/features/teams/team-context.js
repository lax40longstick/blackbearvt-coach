import { getSupabaseClient } from "../../lib/supabase.js";
import { getSessionState } from "../auth/session.js";

async function fetchByIds(supabase, table, ids, columns = "*") {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase.from(table).select(columns).in("id", uniqueIds);
  if (error) {
    return [];
  }

  return data || [];
}

export async function getTenantContext() {
  const sessionState = await getSessionState();
  if (!sessionState.user) {
    return {
      ...sessionState,
      organizations: [],
      teams: [],
      primaryMembership: null,
      primaryOrganization: null,
      primaryTeam: null,
    };
  }

  const supabase = await getSupabaseClient();
  const organizations = await fetchByIds(
    supabase,
    "organizations",
    sessionState.memberships.map((membership) => membership.organization_id),
    "id, name, slug, plan, subscription_status, created_at"
  );
  const teams = await fetchByIds(
    supabase,
    "teams",
    sessionState.memberships.map((membership) => membership.team_id),
    "id, organization_id, name, slug, age_group, season_label, timezone"
  );

  const primaryMembership = sessionState.memberships[0] || null;
  const primaryOrganization = organizations.find((org) => org.id === primaryMembership?.organization_id) || null;
  const primaryTeam = teams.find((team) => team.id === primaryMembership?.team_id) || null;

  return {
    ...sessionState,
    organizations,
    teams,
    primaryMembership,
    primaryOrganization,
    primaryTeam,
  };
}
