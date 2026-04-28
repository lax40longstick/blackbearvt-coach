// Display config only. Authoritative prices live in Stripe, resolved
// server-side in netlify/functions/create-checkout-session.js via the
// STRIPE_PRICE_* environment variables.

const PLAN_CONFIGS = {
  starter: {
    key: "starter",
    label: "Starter",
    monthlyLabel: "$19/mo",
    annualLabel: "$190/yr",
    tagline: "Solo coach, one team",
  },
  team: {
    key: "team",
    label: "Team",
    monthlyLabel: "$39/mo",
    annualLabel: "$390/yr",
    tagline: "Head coach plus staff",
  },
  club: {
    key: "club",
    label: "Club",
    monthlyLabel: "$99/mo",
    annualLabel: "$990/yr",
    tagline: "Association rollout",
  },
};

export function getPlanConfig(plan) {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.starter;
}

export function listPlanConfigs() {
  return Object.values(PLAN_CONFIGS);
}
