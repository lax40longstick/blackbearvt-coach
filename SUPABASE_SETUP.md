# Supabase Setup

## Project

- URL: `https://xdscbxtqayiiucjucjip.supabase.co`
- Auth, database, and RLS all live here.

## Required keys

| Key | Where | Purpose |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | `.env` + Netlify env | frontend + functions |
| `PUBLIC_SUPABASE_ANON_KEY` | `.env` + Netlify env | frontend + checkout function (to verify user) |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify env only, **never in `.env` or git** | Stripe webhook uses this to bypass RLS and write subscription state |

Find all three in the Supabase Dashboard under **Project Settings → API**.

## Schema

Apply in this order via the Supabase SQL editor (or `psql` if you set `DATABASE_URL`):

1. `supabase/schema.sql` — creates tables, indexes, triggers, and two RPCs:
   - `bootstrap_workspace(...)` — atomic org + owner membership + team creation
   - `enforce_team_quota()` — trigger that blocks team inserts beyond the org's plan
2. `supabase/policies.sql` — enables RLS on every table and sets owner/role policies.

Both files are idempotent — safe to re-run after edits.

## Authentication

Under **Authentication → URL Configuration**:

- **Site URL**: your deployed URL (e.g. `https://coachhq.yourdomain.com`)
- **Redirect URLs**: add the same URL plus `http://localhost:3000` for local dev.

Under **Authentication → Providers**:

- Email: enabled. Decide whether to require email confirmation — the app handles both
  cases correctly now (`src/features/auth/auth-ui.js` shows a "check your inbox"
  state when confirmation is on instead of incorrectly redirecting to onboarding).

## Runtime config

The frontend never reads `.env` directly. Instead:

```bash
npm run config:build    # generates runtime-config.js from .env
```

The generated file is loaded by every HTML page before any module script, setting
`window.__BDCHQ_CONFIG__` with only the publishable `PUBLIC_*` values.

In production on Netlify, the build command runs this automatically, pulling env
vars from the Netlify environment.

## Direct Postgres (optional)

`DATABASE_URL` in `.env` + `db.js` + `scripts/test-db.js` exist only for admin
tasks — migrations outside the dashboard, bulk imports, local database health
checks. The app itself uses `@supabase/supabase-js` exclusively.

`db.js` is lazy — it won't attempt to connect unless you call `getSql()`, so
leaving `DATABASE_URL` unset is fine for normal operation.

## Verification

After applying the schema, run these in the SQL editor to confirm:

```sql
-- tables exist
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'organizations', 'teams', 'memberships', 'subscriptions');
-- expect 5 rows

-- RPC exists
select proname from pg_proc where proname = 'bootstrap_workspace';
-- expect 1 row

-- team quota trigger active
select tgname from pg_trigger where tgname = 'enforce_team_quota_on_insert';
-- expect 1 row

-- one-owner-per-org index
select indexname from pg_indexes where indexname = 'memberships_one_owner_per_org';
-- expect 1 row

-- RLS enabled on all 5 tables
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'organizations', 'teams', 'memberships', 'subscriptions');
-- expect all 5 with rowsecurity = true
```
