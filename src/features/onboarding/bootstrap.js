import { getSupabaseClient } from "../../lib/supabase.js";
import { captureAppError } from "../../lib/monitoring.js";
import { trackEvent } from "../../lib/analytics.js";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueSlug(base) {
  const fallback = `team-${Math.random().toString(36).slice(2, 8)}`;
  const safeBase = slugify(base) || fallback;
  return `${safeBase}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Create the organization + owner membership + team in one atomic transaction
 * via the `bootstrap_workspace` Postgres RPC.
 */
export async function createOrganizationAndTeam({
  organizationName,
  teamName,
  ageGroup,
  seasonLabel,
  timezone = "America/New_York",
}) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.rpc("bootstrap_workspace", {
    p_organization_name: organizationName,
    p_organization_slug: uniqueSlug(organizationName),
    p_team_name: teamName,
    p_team_slug: uniqueSlug(teamName),
    p_age_group: ageGroup || null,
    p_season_label: seasonLabel || null,
    p_timezone: timezone || "America/New_York",
  });

  if (error) throw error;
  if (!data?.organization || !data?.team) {
    throw new Error("Bootstrap returned an unexpected payload.");
  }
  return { organization: data.organization, team: data.team };
}

export function bootOnboardingPage() {
  const form = document.querySelector("[data-onboarding-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    const submitBtn = form.querySelector("button[type=submit]");
    const formData = new FormData(form);

    if (submitBtn) submitBtn.disabled = true;
    if (status) status.textContent = "Creating your workspace…";

    try {
      const result = await createOrganizationAndTeam({
        organizationName: String(formData.get("organizationName") || "").trim(),
        teamName: String(formData.get("teamName") || "").trim(),
        ageGroup: String(formData.get("ageGroup") || "").trim(),
        seasonLabel: String(formData.get("seasonLabel") || "").trim(),
        timezone: String(formData.get("timezone") || "").trim() || "America/New_York",
      });

      trackEvent("workspace_created", {
        organization_id: result.organization.id,
        team_id: result.team.id,
      });

      if (status) {
        status.textContent = `Created "${result.organization.name}" · "${result.team.name}". Opening your workspace…`;
      }

      setTimeout(() => {
        window.location.replace("./app.html");
      }, 500);
    } catch (error) {
      captureAppError(error, { where: "bootOnboardingPage.submit" });
      if (status) status.textContent = error.message || "Could not create organization and team.";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
