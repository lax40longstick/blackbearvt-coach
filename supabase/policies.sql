alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "organizations create own" on public.organizations;
create policy "organizations create own"
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "organizations read member" on public.organizations;
create policy "organizations read member"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "organizations update owner" on public.organizations;
create policy "organizations update owner"
on public.organizations
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director')
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director')
      and m.status = 'active'
  )
);

drop policy if exists "teams create member" on public.teams;
create policy "teams create member"
on public.teams
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.memberships m
    where m.organization_id = teams.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director', 'head_coach')
      and m.status = 'active'
  )
);

drop policy if exists "teams read member" on public.teams;
create policy "teams read member"
on public.teams
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = teams.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "teams update coach" on public.teams;
create policy "teams update coach"
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = teams.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director', 'head_coach')
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = teams.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director', 'head_coach')
      and m.status = 'active'
  )
);

drop policy if exists "memberships create owner bootstrap" on public.memberships;
create policy "memberships create owner bootstrap"
on public.memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  and created_by = auth.uid()
  and role = 'owner'
);

drop policy if exists "memberships create org admin" on public.memberships;
create policy "memberships create org admin"
on public.memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.memberships existing
    where existing.organization_id = memberships.organization_id
      and existing.user_id = auth.uid()
      and existing.role in ('owner', 'director', 'head_coach')
      and existing.status = 'active'
  )
);

drop policy if exists "memberships read member" on public.memberships;
create policy "memberships read member"
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
      and existing.status = 'active'
  )
);

drop policy if exists "memberships update org admin" on public.memberships;
create policy "memberships update org admin"
on public.memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships existing
    where existing.organization_id = memberships.organization_id
      and existing.user_id = auth.uid()
      and existing.role in ('owner', 'director', 'head_coach')
      and existing.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships existing
    where existing.organization_id = memberships.organization_id
      and existing.user_id = auth.uid()
      and existing.role in ('owner', 'director', 'head_coach')
      and existing.status = 'active'
  )
);
-- -----------------------------------------------------------------------------
-- subscriptions: read-only from the client.
-- All writes go through the Stripe webhook using the service-role key,
-- which bypasses RLS by design.
-- -----------------------------------------------------------------------------

drop policy if exists "subscriptions read owner or director" on public.subscriptions;
create policy "subscriptions read owner or director"
on public.subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.organization_id = subscriptions.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'director')
      and m.status = 'active'
  )
);

-- v0.3.7 AI logs and marketplace policies
alter table public.ai_generation_logs enable row level security;
alter table public.marketplace_plans enable row level security;
alter table public.marketplace_reviews enable row level security;

drop policy if exists ai_logs_read_own on public.ai_generation_logs;
create policy ai_logs_read_own on public.ai_generation_logs
for select using (auth.uid() = user_id);

drop policy if exists marketplace_read_published on public.marketplace_plans;
create policy marketplace_read_published on public.marketplace_plans
for select using (is_published = true or auth.uid() = author_user_id);

drop policy if exists marketplace_author_insert on public.marketplace_plans;
create policy marketplace_author_insert on public.marketplace_plans
for insert with check (auth.uid() = author_user_id);

drop policy if exists marketplace_author_update on public.marketplace_plans;
create policy marketplace_author_update on public.marketplace_plans
for update using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);

drop policy if exists reviews_read_published on public.marketplace_reviews;
create policy reviews_read_published on public.marketplace_reviews
for select using (true);

drop policy if exists reviews_write_own on public.marketplace_reviews;
create policy reviews_write_own on public.marketplace_reviews
for insert with check (auth.uid() = user_id);
