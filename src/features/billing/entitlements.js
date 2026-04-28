export function getEntitlementsForContext({ plan = "starter", role = "owner" } = {}) {
  const byPlan = {
    starter: {
      maxTeams: 1,
      staffSeats: 1,
      sharedWorkspace: false,
      clubAdmin: false,
    },
    team: {
      maxTeams: 1,
      staffSeats: 5,
      sharedWorkspace: true,
      clubAdmin: false,
    },
    club: {
      maxTeams: 10,
      staffSeats: "custom",
      sharedWorkspace: true,
      clubAdmin: true,
    },
  }[plan] || {
    maxTeams: 1,
    staffSeats: 1,
    sharedWorkspace: false,
    clubAdmin: false,
  };

  return {
    ...byPlan,
    role,
    canManageBilling: role === "owner",
    canInviteStaff: ["owner", "head_coach", "director"].includes(role),
    canManageTeam: ["owner", "head_coach", "director"].includes(role),
  };
}
