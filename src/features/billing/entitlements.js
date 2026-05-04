// BenchBoss Coach HQ — entitlements
// Updated v0.8.0: added Free tier, rebalanced Team/Club seats per market research.
// Plan keys remain stable (free, starter, team, club) so existing Stripe price IDs
// keyed off STRIPE_PRICE_STARTER_* / STRIPE_PRICE_TEAM_* / STRIPE_PRICE_CLUB_* still work.
// (Marketing label for `starter` is now "Pro Coach"; see billing-config.js.)

export function getEntitlementsForContext({ plan = "free", role = "owner" } = {}) {
  const byPlan = {
    free: {
      maxTeams: 1,
      staffSeats: 1,
      maxSavedPracticesActive: 3,
      sharedWorkspace: false,
      clubAdmin: false,
      aiPracticeBuilder: false,
      benchModeOffline: true,
      pdfExport: false,
      publicShareLinks: false,
      marketplacePaidImports: false,
      animatedDrillLibrary: true,
      parentPortalPublish: false,
      gameSheetImport: false,
    },
    starter: {
      // Marketed as "Pro Coach" — see billing-config.js
      maxTeams: 1,
      staffSeats: 1,
      maxSavedPracticesActive: Infinity,
      sharedWorkspace: false,
      clubAdmin: false,
      aiPracticeBuilder: true,
      benchModeOffline: true,
      pdfExport: true,
      publicShareLinks: true,
      marketplacePaidImports: true,
      animatedDrillLibrary: true,
      parentPortalPublish: true,
      gameSheetImport: true,
    },
    team: {
      maxTeams: 1,
      staffSeats: 3,
      maxSavedPracticesActive: Infinity,
      sharedWorkspace: true,
      clubAdmin: false,
      aiPracticeBuilder: true,
      benchModeOffline: true,
      pdfExport: true,
      publicShareLinks: true,
      marketplacePaidImports: true,
      animatedDrillLibrary: true,
      parentPortalPublish: true,
      gameSheetImport: true,
    },
    club: {
      maxTeams: 10,
      staffSeats: "custom",
      maxSavedPracticesActive: Infinity,
      sharedWorkspace: true,
      clubAdmin: true,
      aiPracticeBuilder: true,
      benchModeOffline: true,
      pdfExport: true,
      publicShareLinks: true,
      marketplacePaidImports: true,
      animatedDrillLibrary: true,
      parentPortalPublish: true,
      gameSheetImport: true,
    },
  }[plan] || {
    maxTeams: 1,
    staffSeats: 1,
    maxSavedPracticesActive: 3,
    sharedWorkspace: false,
    clubAdmin: false,
    aiPracticeBuilder: false,
    benchModeOffline: true,
    pdfExport: false,
    publicShareLinks: false,
    marketplacePaidImports: false,
    animatedDrillLibrary: true,
    parentPortalPublish: false,
    gameSheetImport: false,
  };

  return {
    ...byPlan,
    plan,
    role,
    canManageBilling: role === "owner",
    canInviteStaff: ["owner", "head_coach", "director"].includes(role),
    canManageTeam: ["owner", "head_coach", "director"].includes(role),
  };
}
