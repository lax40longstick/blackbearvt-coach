-- BenchBoss Coach HQ v0.10.0 — Marketability Lift + RLS hardening
-- Run after v0.6.0-production-team-hub.sql.
-- Purpose:
--   1) Support Free / Pro / Team / Club pricing structure.
--   2) Harden parent/viewer access so sensitive roster fields are not exposed.
--   3) Force RLS on production tables.
--   4) Provide sanitized parent-facing views for roster and SportsEngine links.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Pricing: allow free tier while preserving existing plan keys.
-- -----------------------------------------------------------------------------
alter table public.organizations drop constraint if exists organizations_plan_check;
alter table public.organizations
  add constraint organizations_plan_check
  check (plan in ('free', 'starter', 'team', 'club'));

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('free', 'starter', 'team', 'club'));

-- -----------------------------------------------------------------------------
-- Helper: safe uuid parsing for storage object path policies.
-- -----------------------------------------------------------------------------
create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Force RLS on client-exposed tables. Service-role/webhook functions still bypass
-- RLS through Supabase service credentials; browser clients do not.
-- -----------------------------------------------------------------------------
alter table if exists public.profiles force row level security;
alter table if exists public.organizations force row level security;
alter table if exists public.teams force row level security;
alter table if exists public.memberships force row level security;
alter table if exists public.subscriptions force row level security;
alter table if exists public.practice_plans force row level security;
alter table if exists public.ai_generation_logs force row level security;
alter table if exists public.marketplace_plans force row level security;
alter table if exists public.marketplace_reviews force row level security;
alter table if exists public.marketplace_purchases force row level security;
alter table if exists public.team_players force row level security;
alter table if exists public.team_guardians force row level security;
alter table if exists public.team_staff force row level security;
alter table if exists public.team_practices force row level security;
alter table if exists public.team_published_drills force row level security;
alter table if exists public.team_lineups force row level security;
alter table if exists public.team_announcements force row level security;
alter table if exists public.team_sources force row level security;
alter table if exists public.gamesheet_import_runs force row level security;
alter table if exists public.team_invites force row level security;

-- -----------------------------------------------------------------------------
-- Memberships: parents/players/viewers can read only their own membership.
-- Managers/coaches/directors can read team/org membership rows for operations.
-- -----------------------------------------------------------------------------
drop policy if exists "memberships read member" on public.memberships;
drop policy if exists memberships_read_self_or_admin on public.memberships;
create policy memberships_read_self_or_admin
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.memberships existing
    where existing.organization_id = memberships.organization_id
      and existing.user_id = auth.uid()
      and existing.role in ('owner', 'director', 'head_coach', 'manager')
      and existing.status = 'active'
  )
);

-- -----------------------------------------------------------------------------
-- Roster privacy:
-- - Coaches/managers can query full team_players, including DOB/source metadata.
-- - Parents/players/viewers use team_player_public_cards, which excludes DOB.
-- -----------------------------------------------------------------------------
drop policy if exists team_players_select_viewers on public.team_players;
drop policy if exists team_players_select_coaches_managers on public.team_players;
create policy team_players_select_coaches_managers
on public.team_players
for select
to authenticated
using (public.can_coach_team(team_id) or public.can_manage_team(team_id));

drop policy if exists team_staff_select_viewers on public.team_staff;
drop policy if exists team_staff_select_coaches_managers on public.team_staff;
create policy team_staff_select_coaches_managers
on public.team_staff
for select
to authenticated
using (public.can_coach_team(team_id) or public.can_manage_team(team_id));

create or replace view public.team_player_public_cards
as
select
  id,
  organization_id,
  team_id,
  source_player_id,
  jersey_number,
  first_name,
  last_name,
  display_name,
  position,
  shoots,
  active,
  created_at,
  updated_at
from public.team_players
where active = true
  and public.can_view_team(team_id);

grant select on public.team_player_public_cards to authenticated;

-- -----------------------------------------------------------------------------
-- Parent-safe source links:
-- table team_sources remains coach/manager-only, but these public team links can
-- be displayed in the parent portal without exposing manager-only source config.
-- -----------------------------------------------------------------------------
create or replace view public.team_public_source_links
as
select
  id,
  organization_id,
  team_id,
  source_type,
  external_id,
  label,
  url,
  created_at,
  updated_at
from public.team_sources
where public.can_view_team(team_id)
  and source_type in ('sportsengine', 'gamesheet')
  and external_id in ('chat', 'roster', 'schedule', 'scores', 'stats');

grant select on public.team_public_source_links to authenticated;

-- -----------------------------------------------------------------------------
-- Published-only data remains visible to parents/viewers.
-- Keep draft lineups/practices coach-only.
-- -----------------------------------------------------------------------------
drop policy if exists team_practices_select_by_role on public.team_practices;
create policy team_practices_select_by_role
on public.team_practices
for select
to authenticated
using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published' and visibility in ('team','public'))
);

drop policy if exists team_lineups_select_by_role on public.team_lineups;
create policy team_lineups_select_by_role
on public.team_lineups
for select
to authenticated
using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published' and visibility = 'team')
);

drop policy if exists team_published_drills_select_by_role on public.team_published_drills;
create policy team_published_drills_select_by_role
on public.team_published_drills
for select
to authenticated
using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published')
);

-- -----------------------------------------------------------------------------
-- Team logos: use safe UUID parsing to avoid invalid object path errors.
-- Expected object path: <team_id>/<filename>.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists team_logos_team_managers_insert on storage.objects;
create policy team_logos_team_managers_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'team-logos'
  and public.can_manage_team(public.try_uuid(split_part(name, '/', 1)))
);

drop policy if exists team_logos_team_managers_update on storage.objects;
create policy team_logos_team_managers_update on storage.objects
for update to authenticated using (
  bucket_id = 'team-logos'
  and public.can_manage_team(public.try_uuid(split_part(name, '/', 1)))
) with check (
  bucket_id = 'team-logos'
  and public.can_manage_team(public.try_uuid(split_part(name, '/', 1)))
);

drop policy if exists team_logos_team_managers_delete on storage.objects;
create policy team_logos_team_managers_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'team-logos'
  and public.can_manage_team(public.try_uuid(split_part(name, '/', 1)))
);

-- -----------------------------------------------------------------------------
-- Verification helper view: run select * from public.rls_production_check;
-- after migrations to confirm table RLS is enabled/forced.
-- -----------------------------------------------------------------------------
create or replace view public.rls_production_check
as
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','organizations','teams','memberships','subscriptions','practice_plans',
    'ai_generation_logs','marketplace_plans','marketplace_reviews','marketplace_purchases',
    'team_players','team_guardians','team_staff','team_practices','team_published_drills',
    'team_lineups','team_announcements','team_sources','gamesheet_import_runs','team_invites'
  )
order by c.relname;

grant select on public.rls_production_check to authenticated;
