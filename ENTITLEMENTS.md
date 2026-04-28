# Bear Den Coach HQ Entitlements

## Plan matrix

### Starter

- Teams: 1
- Staff seats: 1
- Practice planner: yes
- Drill library: yes
- On-ice mode: yes
- Account billing page: yes
- Assistant invites: no
- Club admin: no

### Team

- Teams: 1
- Staff seats: up to 5
- Practice planner: yes
- Drill library: yes
- On-ice mode: yes
- Assistant invites: yes
- Manager access: optional
- Shared workspace: yes
- Club admin: no

### Club

- Teams: up to 10 by default
- Staff seats: plan-based or custom
- Practice planner: yes
- Drill library: yes
- On-ice mode: yes
- Assistant invites: yes
- Manager access: yes
- Shared workspace: yes
- Multi-team admin: yes
- Shared club templates: yes

## Role permissions

### Owner

- Manage billing
- Manage organization settings
- Manage team creation and deletion
- Invite and remove staff

### Head coach

- Full team planning access
- Edit roster, drills, and practice plans
- Invite staff if allowed by plan

### Assistant coach

- View and edit plans, drills, and roster
- No billing access

### Manager

- View schedule and limited team operations
- No billing access
- No destructive planning permissions by default

### Director

- Multi-team oversight
- Shared templates and standards
- Limited billing unless also owner

## Enforcement rules

- Unauthenticated users cannot access account or team data
- Team membership is required to load team-scoped records
- Billing state gates paid features
- Trial expiration should restrict paid-only features without deleting customer data

## Open decisions for user

- Final Starter seat count
- Whether manager role ships in v1
- Final Club team limit
- Downgrade behavior when current usage exceeds plan
