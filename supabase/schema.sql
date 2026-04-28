-- Bear Den Coach HQ — canonical Supabase schema.
-- Apply in order. Idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter' check (plan in ('starter', 'team', 'club')),
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  trial_ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  age_group text,
  season_label text,
  timezone text default 'America/New_York',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'head_coach', 'assistant_coach', 'manager', 'director')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fix for the original schema bug: table-level UNIQUE does not accept
-- expressions like coalesce(). Use a unique index instead.
create unique index if not exists memberships_org_user_team_unique
  on public.memberships (
    organization_id,
    user_id,
    coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Exactly one active owner per organization.
create unique index if not exists memberships_one_owner_per_org
  on public.memberships (organization_id)
  where role = 'owner' and status = 'active';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null check (plan in ('starter', 'team', 'club')),
  status text not null check (status in ('trial', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_teams_organization_id on public.teams(organization_id);
create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_organization_id on public.memberships(organization_id);
create index if not exists idx_memberships_team_id on public.memberships(team_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);

-- -----------------------------------------------------------------------------
-- Triggers — updated_at on every table
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute procedure public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute procedure public.set_updated_at();

drop trigger if exists set_memberships_updated_at on public.memberships;
create trigger set_memberships_updated_at
before update on public.memberships
for each row execute procedure public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- New-user trigger: mirror auth.users into public.profiles
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Plan-based team quota — enforced server-side, not just in the JS entitlements.
-- Prevents a 'starter' plan from creating a 2nd team by hitting the API direct.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_team_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_plan text;
  team_count integer;
  max_teams integer;
begin
  select plan into org_plan from public.organizations where id = new.organization_id;
  if org_plan is null then
    raise exception 'organization not found for team quota check';
  end if;

  select count(*) into team_count from public.teams where organization_id = new.organization_id;

  max_teams := case org_plan
    when 'starter' then 1
    when 'team'    then 1
    when 'club'    then 10
    else 1
  end;

  if team_count >= max_teams then
    raise exception 'team quota exceeded for plan "%": limit is % team(s)', org_plan, max_teams
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_team_quota_on_insert on public.teams;
create trigger enforce_team_quota_on_insert
before insert on public.teams
for each row execute procedure public.enforce_team_quota();

-- -----------------------------------------------------------------------------
-- Atomic workspace bootstrap — replaces the non-atomic JS sequence.
-- Creates org + owner-membership + team + updates membership with team_id,
-- all in a single transaction. If anything fails, nothing is left behind.
-- -----------------------------------------------------------------------------

create or replace function public.bootstrap_workspace(
  p_organization_name text,
  p_organization_slug text,
  p_team_name text,
  p_team_slug text,
  p_age_group text default null,
  p_season_label text default null,
  p_timezone text default 'America/New_York'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org public.organizations;
  v_team public.teams;
begin
  if v_user_id is null then
    raise exception 'must be signed in to bootstrap a workspace' using errcode = '28000';
  end if;

  if coalesce(trim(p_organization_name), '') = '' or coalesce(trim(p_team_name), '') = '' then
    raise exception 'organization and team name are required' using errcode = '22023';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (p_organization_name, p_organization_slug, v_user_id)
  returning * into v_org;

  insert into public.memberships (organization_id, user_id, role, status, created_by)
  values (v_org.id, v_user_id, 'owner', 'active', v_user_id);

  insert into public.teams (organization_id, name, slug, age_group, season_label, timezone, created_by)
  values (v_org.id, p_team_name, p_team_slug, p_age_group, p_season_label, p_timezone, v_user_id)
  returning * into v_team;

  update public.memberships
     set team_id = v_team.id
   where organization_id = v_org.id
     and user_id = v_user_id
     and role = 'owner';

  return jsonb_build_object(
    'organization', to_jsonb(v_org),
    'team', to_jsonb(v_team)
  );
end;
$$;

grant execute on function public.bootstrap_workspace(text, text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Practice sharing - v0.3.5
-- Stores shareable practice plans for public coach/assistant/player viewing.
-- -----------------------------------------------------------------------------

create table if not exists public.practice_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Practice Plan',
  data jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_practice_plans_user_created on public.practice_plans(user_id, created_at desc);
create index if not exists idx_practice_plans_public on public.practice_plans(id) where is_public = true;

alter table public.practice_plans enable row level security;

drop policy if exists practice_plans_owner_select on public.practice_plans;
create policy practice_plans_owner_select
  on public.practice_plans for select
  using (auth.uid() = user_id);

drop policy if exists practice_plans_public_select on public.practice_plans;
create policy practice_plans_public_select
  on public.practice_plans for select
  using (is_public = true);

drop policy if exists practice_plans_owner_insert on public.practice_plans;
create policy practice_plans_owner_insert
  on public.practice_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists practice_plans_owner_update on public.practice_plans;
create policy practice_plans_owner_update
  on public.practice_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists practice_plans_owner_delete on public.practice_plans;
create policy practice_plans_owner_delete
  on public.practice_plans for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- v0.3.7 launch-ready feature tables
-- -----------------------------------------------------------------------------

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('success', 'error', 'blocked')),
  prompt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generation_logs_user_created on public.ai_generation_logs(user_id, created_at desc);

create table if not exists public.marketplace_plans (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Coach',
  title text not null,
  age_group text,
  focus text,
  plan_data jsonb not null default '{}'::jsonb,
  price_cents integer not null default 0 check (price_cents >= 0),
  stripe_price_id text,
  is_published boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  marketplace_plan_id uuid not null references public.marketplace_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (marketplace_plan_id, user_id)
);

drop trigger if exists set_marketplace_plans_updated_at on public.marketplace_plans;
create trigger set_marketplace_plans_updated_at
before update on public.marketplace_plans
for each row execute procedure public.set_updated_at();
