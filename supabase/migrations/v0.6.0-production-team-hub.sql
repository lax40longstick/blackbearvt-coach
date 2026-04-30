-- BenchBoss Coach HQ v0.6.0 — Production Team Hub
-- Idempotent migration for persistent roster, lineups, parent portal, invites,
-- branding persistence, GameSheet history, and SportsEngine link settings.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Membership role expansion: production app includes parents / players / viewers.
-- -----------------------------------------------------------------------------
alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check
  check (role in ('owner', 'director', 'head_coach', 'assistant_coach', 'manager', 'parent', 'player', 'viewer'));

-- -----------------------------------------------------------------------------
-- Team branding persistence
-- -----------------------------------------------------------------------------
alter table public.teams add column if not exists brand_product_name text default 'BenchBoss Coach HQ';
alter table public.teams add column if not exists brand_short_name text default 'BenchBoss';
alter table public.teams add column if not exists brand_primary_color text default '#7dd3d8';
alter table public.teams add column if not exists brand_secondary_color text default '#f4cf57';
alter table public.teams add column if not exists brand_accent_color text default '#4ad9a8';
alter table public.teams add column if not exists brand_background_color text default '#0a0a0a';
alter table public.teams add column if not exists brand_monogram text default 'BB';
alter table public.teams add column if not exists logo_url text;

-- -----------------------------------------------------------------------------
-- Helper functions used by RLS policies.
-- -----------------------------------------------------------------------------
create or replace function public.current_user_team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships m
  where m.team_id = p_team_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  order by case m.role
    when 'owner' then 1
    when 'director' then 2
    when 'head_coach' then 3
    when 'assistant_coach' then 4
    when 'manager' then 5
    when 'parent' then 6
    when 'player' then 7
    else 8
  end
  limit 1;
$$;

create or replace function public.is_team_member(p_team_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.team_id = p_team_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_team_member(p_team_id, array['owner','director','head_coach','manager']);
$$;

create or replace function public.can_coach_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_team_member(p_team_id, array['owner','director','head_coach','assistant_coach']);
$$;

create or replace function public.can_view_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_team_member(p_team_id, array['owner','director','head_coach','assistant_coach','manager','parent','player','viewer']);
$$;

-- -----------------------------------------------------------------------------
-- Persistent roster + team contacts
-- -----------------------------------------------------------------------------
create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  source_player_id text,
  jersey_number text,
  first_name text,
  last_name text,
  display_name text not null,
  dob text,
  position text check (position in ('F','D','G','F/D','NA')) default 'F',
  shoots text check (shoots in ('L','R','NA')) default 'NA',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, jersey_number, display_name)
);

create table if not exists public.team_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.team_players(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  relationship text default 'guardian',
  receive_notifications boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  title text not null default 'Staff',
  role text check (role in ('owner','director','head_coach','assistant_coach','manager','staff')) default 'staff',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Published team content: practices, drills, lineups, announcements.
-- -----------------------------------------------------------------------------
create table if not exists public.team_practices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  practice_date date,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'coaches' check (visibility in ('coaches','team','public')),
  data jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_published_drills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  practice_id uuid references public.team_practices(id) on delete cascade,
  drill_id text,
  title text not null,
  category text,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_lineups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  game_id uuid,
  game_label text,
  opponent text,
  game_date date,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'coaches' check (visibility in ('coaches','team')),
  data jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  body text,
  audience text not null default 'team' check (audience in ('coaches','parents','players','team')),
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- External source settings + GameSheet import snapshots.
-- -----------------------------------------------------------------------------
create table if not exists public.team_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  source_type text not null check (source_type in ('gamesheet','sportsengine','manual','website')),
  label text,
  url text,
  external_id text default 'primary',
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gamesheet_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  source text not null default 'gamesheet',
  source_url text,
  imported_at timestamptz not null default now(),
  games_count integer not null default 0,
  player_stats_count integer not null default 0,
  team_stats jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Invite links for parents, managers, assistant coaches, viewers.
-- -----------------------------------------------------------------------------
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  email text,
  role text not null check (role in ('head_coach','assistant_coach','manager','parent','player','viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_team_players_team on public.team_players(team_id, active, jersey_number);
create index if not exists idx_team_guardians_team on public.team_guardians(team_id);
create index if not exists idx_team_guardians_player on public.team_guardians(player_id);
create index if not exists idx_team_staff_team on public.team_staff(team_id);
create index if not exists idx_team_practices_team on public.team_practices(team_id, status, practice_date desc);
create index if not exists idx_team_lineups_team on public.team_lineups(team_id, status, game_date desc);
create index if not exists idx_team_sources_team on public.team_sources(team_id, source_type);
create unique index if not exists team_sources_team_type_external_unique on public.team_sources (team_id, source_type, external_id);
create index if not exists idx_team_invites_token on public.team_invites(token);
create index if not exists idx_gamesheet_import_runs_team_imported on public.gamesheet_import_runs(team_id, imported_at desc);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
drop trigger if exists set_team_players_updated_at on public.team_players;
create trigger set_team_players_updated_at before update on public.team_players for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_guardians_updated_at on public.team_guardians;
create trigger set_team_guardians_updated_at before update on public.team_guardians for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_staff_updated_at on public.team_staff;
create trigger set_team_staff_updated_at before update on public.team_staff for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_practices_updated_at on public.team_practices;
create trigger set_team_practices_updated_at before update on public.team_practices for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_published_drills_updated_at on public.team_published_drills;
create trigger set_team_published_drills_updated_at before update on public.team_published_drills for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_lineups_updated_at on public.team_lineups;
create trigger set_team_lineups_updated_at before update on public.team_lineups for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_announcements_updated_at on public.team_announcements;
create trigger set_team_announcements_updated_at before update on public.team_announcements for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_sources_updated_at on public.team_sources;
create trigger set_team_sources_updated_at before update on public.team_sources for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_invites_updated_at on public.team_invites;
create trigger set_team_invites_updated_at before update on public.team_invites for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS enablement
-- -----------------------------------------------------------------------------
alter table public.team_players enable row level security;
alter table public.team_guardians enable row level security;
alter table public.team_staff enable row level security;
alter table public.team_practices enable row level security;
alter table public.team_published_drills enable row level security;
alter table public.team_lineups enable row level security;
alter table public.team_announcements enable row level security;
alter table public.team_sources enable row level security;
alter table public.gamesheet_import_runs enable row level security;
alter table public.team_invites enable row level security;

-- Roster / contacts policies
drop policy if exists team_players_select_viewers on public.team_players;
create policy team_players_select_viewers on public.team_players for select to authenticated using (public.can_view_team(team_id));
drop policy if exists team_players_manage on public.team_players;
create policy team_players_manage on public.team_players for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

drop policy if exists team_guardians_select_managers on public.team_guardians;
create policy team_guardians_select_managers on public.team_guardians for select to authenticated using (public.can_manage_team(team_id));
drop policy if exists team_guardians_manage on public.team_guardians;
create policy team_guardians_manage on public.team_guardians for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

drop policy if exists team_staff_select_viewers on public.team_staff;
create policy team_staff_select_viewers on public.team_staff for select to authenticated using (public.can_view_team(team_id));
drop policy if exists team_staff_manage on public.team_staff;
create policy team_staff_manage on public.team_staff for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

-- Practices and published drills: parents only see published/team-visible items.
drop policy if exists team_practices_select_by_role on public.team_practices;
create policy team_practices_select_by_role on public.team_practices for select to authenticated using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published' and visibility in ('team','public'))
);
drop policy if exists team_practices_write_coaches on public.team_practices;
create policy team_practices_write_coaches on public.team_practices for all to authenticated using (public.can_coach_team(team_id)) with check (public.can_coach_team(team_id));

drop policy if exists team_published_drills_select_by_role on public.team_published_drills;
create policy team_published_drills_select_by_role on public.team_published_drills for select to authenticated using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published')
);
drop policy if exists team_published_drills_write_coaches on public.team_published_drills;
create policy team_published_drills_write_coaches on public.team_published_drills for all to authenticated using (public.can_coach_team(team_id)) with check (public.can_coach_team(team_id));

-- Lineups: parents/viewers see only published lineups.
drop policy if exists team_lineups_select_by_role on public.team_lineups;
create policy team_lineups_select_by_role on public.team_lineups for select to authenticated using (
  public.can_coach_team(team_id)
  or public.can_manage_team(team_id)
  or (public.can_view_team(team_id) and status = 'published' and visibility = 'team')
);
drop policy if exists team_lineups_write_coaches on public.team_lineups;
create policy team_lineups_write_coaches on public.team_lineups for all to authenticated using (public.can_coach_team(team_id)) with check (public.can_coach_team(team_id));

-- Announcements / sources / imports.
drop policy if exists team_announcements_select_by_role on public.team_announcements;
create policy team_announcements_select_by_role on public.team_announcements for select to authenticated using (
  public.can_manage_team(team_id)
  or public.can_coach_team(team_id)
  or (public.can_view_team(team_id) and status = 'published' and audience in ('parents','players','team'))
);
drop policy if exists team_announcements_write_managers on public.team_announcements;
create policy team_announcements_write_managers on public.team_announcements for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

drop policy if exists team_sources_select_managers on public.team_sources;
create policy team_sources_select_managers on public.team_sources for select to authenticated using (public.can_manage_team(team_id) or public.can_coach_team(team_id));
drop policy if exists team_sources_manage on public.team_sources;
create policy team_sources_manage on public.team_sources for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

drop policy if exists gamesheet_import_runs_select_viewers on public.gamesheet_import_runs;
create policy gamesheet_import_runs_select_viewers on public.gamesheet_import_runs for select to authenticated using (team_id is null or public.can_view_team(team_id));
drop policy if exists gamesheet_import_runs_manage on public.gamesheet_import_runs;
create policy gamesheet_import_runs_manage on public.gamesheet_import_runs for insert to authenticated with check (team_id is null or public.can_manage_team(team_id) or public.can_coach_team(team_id));

-- Invites are visible/manageable only by team managers/coaches. Accept uses Netlify function/service key.
drop policy if exists team_invites_select_managers on public.team_invites;
create policy team_invites_select_managers on public.team_invites for select to authenticated using (public.can_manage_team(team_id));
drop policy if exists team_invites_manage on public.team_invites;
create policy team_invites_manage on public.team_invites for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

-- -----------------------------------------------------------------------------
-- Storage: public logo bucket with manager-controlled uploads.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists team_logos_public_read on storage.objects;
create policy team_logos_public_read on storage.objects
for select using (bucket_id = 'team-logos');

drop policy if exists team_logos_team_managers_insert on storage.objects;
create policy team_logos_team_managers_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'team-logos'
  and public.can_manage_team((split_part(name, '/', 1))::uuid)
);

drop policy if exists team_logos_team_managers_update on storage.objects;
create policy team_logos_team_managers_update on storage.objects
for update to authenticated using (
  bucket_id = 'team-logos'
  and public.can_manage_team((split_part(name, '/', 1))::uuid)
) with check (
  bucket_id = 'team-logos'
  and public.can_manage_team((split_part(name, '/', 1))::uuid)
);

drop policy if exists team_logos_team_managers_delete on storage.objects;
create policy team_logos_team_managers_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'team-logos'
  and public.can_manage_team((split_part(name, '/', 1))::uuid)
);
