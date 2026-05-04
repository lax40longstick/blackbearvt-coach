// Display config only. Authoritative prices live in Stripe, resolved
// server-side in netlify/functions/create-checkout-session.js via the
// STRIPE_PRICE_* environment variables.
//
// v0.8.0 — Pricing restructure per deep research report:
//   - Added Free tier (no Stripe; account-only)
//   - Repositioned `starter` plan as "Pro Coach" at $89/yr (was $190/yr)
//   - Lowered `team` to $179/yr for 3 seats (was $390/yr for 5)
//   - Held `club` at $99/team-year for multi-team rollout
//
// The internal plan key `starter` is unchanged so existing Stripe env vars
// (STRIPE_PRICE_STARTER_MONTHLY / _ANNUAL) continue to work. After updating
// the Stripe Dashboard prices, no code rename is required.

const PLAN_CONFIGS = {
  free: {
    key: "free",
    label: "Coach Free",
    monthlyLabel: "$0",
    annualLabel: "Free",
    tagline: "Try the rink workflow at no cost",
    pricePerSeat: 0,
    maxStaffSeats: 1,
    requiresCheckout: false,
  },
  starter: {
    key: "starter",
    label: "Pro Coach",
    monthlyLabel: "$9/mo",
    annualLabel: "$89/yr",
    tagline: "Solo coach, full rink-first workflow",
    pricePerSeat: 89,
    maxStaffSeats: 1,
    requiresCheckout: true,
  },
  team: {
    key: "team",
    label: "Team",
    monthlyLabel: "$18/mo",
    annualLabel: "$179/yr",
    tagline: "Head coach plus two assistants",
    pricePerSeat: 60,
    maxStaffSeats: 3,
    requiresCheckout: true,
  },
  club: {
    key: "club",
    label: "Club",
    monthlyLabel: "$99/mo per team",
    annualLabel: "$990/yr per team",
    tagline: "Multi-team association rollout",
    pricePerSeat: 99,
    maxStaffSeats: "custom",
    requiresCheckout: true,
  },
};

export function getPlanConfig(plan) {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;
}

export function listPlanConfigs() {
  return Object.values(PLAN_CONFIGS);
}
