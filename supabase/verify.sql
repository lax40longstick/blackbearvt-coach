-- =============================================================================
-- Bear Den Coach HQ — Supabase migration verifier
-- =============================================================================
-- Run these in Supabase SQL Editor AFTER applying:
--   1. supabase/schema.sql
--   2. supabase/policies.sql
--   3. supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql
--
-- Each section corresponds to a verification asked for in HUMAN_LAUNCH_PLAN §2.
-- Each block is independent — you can run them one at a time. Expected results
-- are documented inline.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Section 0 — Schema and RLS smoke check
-- Confirms every launch-critical table exists and has RLS enabled.
-- -----------------------------------------------------------------------------
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p where p.tablename = c.relname) as policy_count
from pg_class c
join pg_namespace n on c.relnamespace = n.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','organizations','teams','memberships','subscriptions',
    'practice_plans','ai_generation_logs',
    'marketplace_plans','marketplace_reviews','marketplace_purchases'
  )
order by c.relname;
-- Expected: every row shows rls_enabled = true and policy_count >= 1.


-- -----------------------------------------------------------------------------
-- Section 1 — practice_plans private/public RLS
-- §2: "practice_plans private/public RLS still works"
-- -----------------------------------------------------------------------------
-- Lists every policy on practice_plans so you can see SELECT/INSERT/UPDATE/DELETE
-- coverage and confirm the public-read policy is restricted to is_public = true.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'practice_plans'
order by cmd, policyname;
-- Expected: at least one SELECT policy whose qual references `is_public = true`
-- OR `auth.uid() = author_user_id` (or similar). No policy that allows reading
-- private plans by an unauthenticated or unrelated user.


-- -----------------------------------------------------------------------------
-- Section 2 — ai_generation_logs RLS
-- §2: "ai_generation_logs can be inserted only by service role and read by owner"
-- -----------------------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'ai_generation_logs'
order by cmd, policyname;
-- Expected:
--   * A SELECT policy with qual = `(user_id = auth.uid())`
--   * NO INSERT/UPDATE/DELETE policies (service role bypasses RLS, so writes
--     only happen via the webhook/AI function using SUPABASE_SERVICE_ROLE_KEY).


-- -----------------------------------------------------------------------------
-- Section 3 — marketplace_plans visibility
-- §2: "marketplace_plans only exposes published plans to non-authors"
-- -----------------------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'marketplace_plans'
order by cmd, policyname;
-- Expected SELECT policy qual: `(is_published = true) OR (author_user_id = auth.uid())`
-- (or equivalent). Authors should be able to read their own drafts; everyone
-- else only sees published rows.


-- -----------------------------------------------------------------------------
-- Section 4 — marketplace_reviews uniqueness
-- §2: "marketplace_reviews prevents duplicate reviews per user/plan"
-- -----------------------------------------------------------------------------
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'marketplace_reviews';
-- Expected: an index whose definition contains
--   UNIQUE ... (marketplace_plan_id, user_id)
-- This prevents a user from reviewing the same plan twice.


-- -----------------------------------------------------------------------------
-- Section 5 — marketplace_purchases (added in patch.3)
-- Verifies one-paid-purchase-per-user-per-plan and read-own-only RLS.
-- -----------------------------------------------------------------------------
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'marketplace_purchases';
-- Expected:
--   * marketplace_purchases_paid_unique — UNIQUE ... (user_id, marketplace_plan_id)
--     WHERE (status = 'paid')   ← partial index, not a plain unique constraint
--   * idx_marketplace_purchases_user, _plan, _intent — supporting indexes

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'marketplace_purchases'
order by cmd;
-- Expected: ONE select policy `(user_id = auth.uid())` and NO write policies.


-- -----------------------------------------------------------------------------
-- Section 6 — Quick sanity counts
-- Useful for noticing if you accidentally seeded production with test data.
-- -----------------------------------------------------------------------------
select 'organizations'         as table_name, count(*) as row_count from public.organizations
union all
select 'teams',                 count(*) from public.teams
union all
select 'memberships',           count(*) from public.memberships
union all
select 'subscriptions',         count(*) from public.subscriptions
union all
select 'marketplace_plans',     count(*) from public.marketplace_plans
union all
select 'marketplace_purchases', count(*) from public.marketplace_purchases
union all
select 'ai_generation_logs',    count(*) from public.ai_generation_logs;


-- -----------------------------------------------------------------------------
-- Section 7 — Trigger and function presence
-- Confirms the bootstrap RPC and team-quota trigger from earlier releases are
-- still installed (they're easy to drop accidentally during a schema replay).
-- -----------------------------------------------------------------------------
select proname, prosecdef as security_definer
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
  and proname in ('bootstrap_workspace', 'enforce_team_quota', 'set_updated_at', 'handle_new_user');
-- Expected: 4 rows. bootstrap_workspace and handle_new_user MUST have
-- security_definer = true (otherwise RLS bites them).

select tgname, relname
from pg_trigger t
join pg_class c on t.tgrelid = c.oid
where t.tgname in ('enforce_team_quota_trigger', 'memberships_one_owner_per_org', 'set_marketplace_plans_updated_at');
-- Expected: rows for the team quota and updated-at triggers.
