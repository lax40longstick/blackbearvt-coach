# Changelog — v0.6.0 "Production Team Hub"

This release turns BenchBoss Coach HQ from a single-browser beta into a production-ready team platform foundation.

## Added

### Persistent Supabase team data
- Added `supabase/migrations/v0.6.0-production-team-hub.sql`.
- Added production tables for:
  - `team_players`
  - `team_guardians`
  - `team_staff`
  - `team_practices`
  - `team_published_drills`
  - `team_lineups`
  - `team_announcements`
  - `team_sources`
  - `team_invites`
  - `gamesheet_import_runs`
- Added indexes, `updated_at` triggers, and RLS policies.
- Expanded `memberships.role` to include `parent`, `player`, and `viewer`.

### Parent / manager / coach permission model
- Added RLS helper functions:
  - `current_user_team_role(team_id)`
  - `is_team_member(team_id, roles)`
  - `can_manage_team(team_id)`
  - `can_coach_team(team_id)`
  - `can_view_team(team_id)`
- Parents/viewers can read published lineups, published practices, roster, and stats.
- Managers can sync roster/source data.
- Coaches can publish practices and lineups.

### Production Team Hub UI
- Added `src/features/team-hub/production-team-store.js`.
- Added `src/features/team-hub/production-team-hub.js`.
- Added dashboard/settings panel for:
  - pulling production team data
  - pushing roster to Supabase
  - publishing lineup to parents
  - publishing practice/drills to parents
  - syncing team branding to Supabase
  - creating invite links
  - saving SportsEngine/GameSheet links
  - uploading team logos to Supabase Storage

### Parent Portal
- Added `parent.html`.
- Added `src/features/team-hub/parent-portal.js`.
- Parent portal shows:
  - team branding
  - published lineup
  - published practices/drills
  - roster
  - latest GameSheet stat snapshot
  - SportsEngine chat/schedule/roster deep links

### Invite system
- Added `netlify/functions/create-team-invite.js`.
- Added `netlify/functions/accept-team-invite.js`.
- Invite flow supports parent, player, viewer, manager, and assistant coach roles.

### Branding persistence
- Added persistent team branding fields to `teams`.
- Added Supabase Storage bucket setup for `team-logos`.
- Added production logo upload flow.

### SportsEngine API readiness
- Added `netlify/functions/sportsengine-sync.js` placeholder.
- Added team source records for SportsEngine roster/chat/schedule links.
- API sync intentionally remains gated until SportsEngine credentials/API access are available.

## Changed

- Updated app version to `0.6.0`.
- Updated `team-context.js` to fetch team branding fields.
- Added Production Team Hub entry points to `app.html`.
- Updated Netlify env template with GameSheet/SportsEngine settings.

## Human setup required

Before production use:
1. Run the v0.6.0 Supabase migration.
2. Confirm RLS policies in Supabase.
3. Add required Netlify environment variables.
4. Redeploy with cleared cache.
5. Test coach, manager, and parent accounts separately.
6. Add SportsEngine API credentials only after access is approved.
