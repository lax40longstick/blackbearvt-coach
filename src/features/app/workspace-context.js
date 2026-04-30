import { getTenantContext } from "../teams/team-context.js";

function fill(selector, value) {
  const el = document.querySelector(selector);
  if (el && value) el.textContent = value;
}

export async function hydrateWorkspaceContext() {
  const context = await getTenantContext();
  if (!context.user) return context;

  const teamName = context.primaryTeam?.name || "Coach Workspace";
  const ageGroup = context.primaryTeam?.age_group || "";
  const seasonLabel = context.primaryTeam?.season_label || "";
  const orgName = context.primaryOrganization?.name || "BenchBoss";
  const role = context.primaryMembership?.role || "member";

  fill("#topTitle", orgName.toUpperCase());
  fill("#topSubtitle", [teamName, role].filter(Boolean).join(" · "));
  fill("[data-workspace-org]", orgName.toUpperCase());
  fill("[data-workspace-team]", [teamName, ageGroup, seasonLabel].filter(Boolean).join(" · "));
  fill("[data-workspace-user]", context.user.email || "Signed in");

  return context;
}
