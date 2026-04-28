-- Migration: v0.3.7-patch.3 — marketplace_purchases
-- Apply in Supabase SQL editor. Idempotent — safe to re-run.
--
-- Tracks one-time Stripe purchases of paid marketplace packs. Inserts come
-- from the Stripe webhook (using the service-role key, which bypasses RLS).
-- Users can read their own purchases.

create table if not exists public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace_plan_id uuid not null references public.marketplace_plans(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'failed')),
  purchased_at timestamptz not null default now()
);

create index if not exists idx_marketplace_purchases_user
  on public.marketplace_purchases(user_id);

create index if not exists idx_marketplace_purchases_plan
  on public.marketplace_purchases(marketplace_plan_id);

create index if not exists idx_marketplace_purchases_intent
  on public.marketplace_purchases(stripe_payment_intent_id);

-- Only one *paid* purchase per user/plan. Pending and failed rows are allowed
-- to accumulate so we don't lose history if a session retries.
create unique index if not exists marketplace_purchases_paid_unique
  on public.marketplace_purchases(user_id, marketplace_plan_id)
  where status = 'paid';

alter table public.marketplace_purchases enable row level security;

drop policy if exists marketplace_purchases_read_own on public.marketplace_purchases;
create policy marketplace_purchases_read_own on public.marketplace_purchases
  for select using (user_id = auth.uid());

-- No insert/update/delete policies → only the service role (webhook) can write.
