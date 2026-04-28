import { getTenantContext } from "../teams/team-context.js";
import { getPlanConfig, listPlanConfigs } from "../../lib/billing-config.js";
import { getEntitlementsForContext } from "../billing/entitlements.js";
import { startCheckout } from "../billing/checkout.js";
import { signOutCurrentUser } from "../auth/session.js";

function fill(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value ?? "";
}

function renderList(selector, items) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

export async function bootAccountPage() {
  const context = await getTenantContext();
  if (!context.user) return context;

  const planKey = context.primaryOrganization?.plan || "starter";
  const planConfig = getPlanConfig(planKey);
  const entitlements = getEntitlementsForContext({
    plan: planKey,
    role: context.primaryMembership?.role || "owner",
  });

  fill("[data-session-email]", context.user.email || "Signed in");
  fill(
    "[data-session-user]",
    [context.user.user_metadata?.first_name, context.user.user_metadata?.last_name].filter(Boolean).join(" ") || "Signed-in user"
  );
  fill("[data-session-membership-count]", String(context.memberships.length));
  fill("[data-org-name]", context.primaryOrganization?.name || "No organization yet");
  fill("[data-org-slug]", context.primaryOrganization?.slug || "Not created");
  fill("[data-team-name]", context.primaryTeam?.name || "No team yet");
  fill("[data-team-meta]", [context.primaryTeam?.age_group, context.primaryTeam?.season_label].filter(Boolean).join(" · ") || "Finish onboarding");
  fill("[data-role-name]", context.primaryMembership?.role || "No role");
  fill("[data-plan-name]", planConfig.label);
  fill("[data-plan-price]", planConfig.monthlyLabel);
  fill("[data-subscription-status]", context.primaryOrganization?.subscription_status || "trial");

  renderList(
    "[data-entitlements]",
    [
      `Teams allowed: ${entitlements.maxTeams}`,
      `Staff seats: ${entitlements.staffSeats}`,
      `Shared workspace: ${entitlements.sharedWorkspace ? "Yes" : "No"}`,
      `Club admin: ${entitlements.clubAdmin ? "Yes" : "No"}`,
    ]
  );

  renderList(
    "[data-available-plans]",
    listPlanConfigs().map((plan) => `${plan.label}: ${plan.monthlyLabel}`)
  );

  const signOutBtn = document.querySelector("[data-signout]");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await signOutCurrentUser();
      window.location.replace("./auth.html");
    });
  }

  const billingButton = document.querySelector("[data-manage-plan]");
  if (billingButton) {
    billingButton.addEventListener("click", async () => {
      await startCheckout(planKey, { source: "account" });
    });
  }

  return context;
}
