# Changelog — v0.2.0 "billing that actually works"

Audit-driven rebuild of the billing, schema, auth, and onboarding paths.
This release gets the app to a point where you can actually take money.

## Must-fix before launch — DONE

### Billing end-to-end, for real
- `netlify/functions/create-checkout-session.js` — verifies the caller's Supabase
  bearer token, confirms they own (or direct) the org they're billing, resolves
  price IDs from `STRIPE_PRICE_*` env vars, creates a Stripe Checkout Session,
  returns the hosted checkout URL.
- `netlify/functions/stripe-webhook.js` — verifies the Stripe signature, handles
  7 event types (`checkout.session.completed`, `customer.subscription.{created,updated,deleted,paused,resumed}`, `invoice.payment_failed`),
  writes to both `subscriptions` and `organizations.{plan, subscription_status, trial_ends_at}`
  using the service-role key (bypasses RLS, which is correct for a webhook).
- `src/features/billing/checkout.js` — no longer a scaffold; POSTs to the function
  with the Supabase access token, handles not-signed-in case with a proper
  `?next=` redirect back to checkout after auth, redirects to Stripe on success.
- `src/features/billing/pricing-ui.js` — monthly/annual toggle now flows into the
  checkout call as `interval: "month"` or `"year"`.
- `src/lib/billing-config.js` — cleaned up; display-only labels, authoritative
  prices now live in Stripe and env vars.

### Schema — the dealbreakers
- **Fixed broken `UNIQUE` on `coalesce()`** — Postgres doesn't accept expressions
  in table-level UNIQUE constraints. Replaced with a proper unique index
  (`memberships_org_user_team_unique`). This one would have silently failed
  schema application.
- Added `subscriptions` table (was in architecture doc, didn't exist).
- **Enabled RLS on `subscriptions`** with a read-only policy for owners and
  directors. Writes only happen via the Stripe webhook using the service-role
  key (which bypasses RLS, as it should).
- Added `CHECK` constraints on `organizations.subscription_status`, `organizations.plan`,
  `subscriptions.status`, `subscriptions.billing_interval`, `memberships.role`, `memberships.status`.
- Added `memberships_one_owner_per_org` partial unique index — you can't accidentally
  create two active owners on the same org.
- Added `enforce_team_quota()` trigger on `teams` insert — server-side enforcement
  of plan-based team limits. A `starter` plan can't create a second team by
  calling the REST API directly, even if they bypass the UI.
- Added `bootstrap_workspace(...)` RPC (`security definer`) that creates org +
  owner membership + team + updates membership.team_id in ONE transaction.
  Replaces the 4-step JS sequence in `onboarding/bootstrap.js` that could leave
  ghost orgs if any step failed.
- Added `idx_subscriptions_customer` for Stripe customer lookups.
- **Verified end-to-end against a real Postgres 16 instance** — schema applies
  cleanly, `bootstrap_workspace` creates all three rows atomically, quota
  trigger correctly blocks a second team on starter plan but allows it on club,
  one-owner-per-org index blocks duplicate owner inserts, `handle_new_user`
  trigger correctly mirrors auth.users → public.profiles with metadata.

### Env / config
- `.env` cleaned: fixed the 4-space indent bug on `PUBLIC_SUPABASE_ANON_KEY`,
  removed the broken `DATABASE_URL=...[YOUR-PASSWORD]...` template line.
- `.env.example` rewritten to document every server-side secret and price ID,
  clearly separated from publishable values.

## Should-fix — DONE

### Auth flow correctness
- `src/features/auth/auth-ui.js` — when email confirmation is enabled, signup
  now shows "check your inbox" instead of redirecting to onboarding (which
  would bounce right back to auth). Respects `?next=` param (with open-redirect
  protection — only same-origin relative paths allowed).
- `src/features/auth/session.js` — `redirectIfAuthenticated` accepts a
  `fallbackDestination` so the `?next=` target from auth pages flows through.
- `requireAuthenticatedPage` now passes the current URL as `?next=` so users
  return to where they came from after signing in.

### Session listener scoping
- `src/site-bootstrap.js` — `attachAuthStateListener` now only attaches on
  protected pages (`account`, `onboarding`, `app`). Previously it ran on every
  page including public ones, meaning a token refresh failure while a signed-in
  user was browsing `pricing.html` would kick them to `auth.html`.

### Config deduplication
- Removed the inline `window.__BDCHQ_CONFIG__ = { ... }` fallback block from
  all 5 HTML pages (`auth`, `account`, `onboarding`, `pricing`, `app`). Each
  had 10 lines duplicating hardcoded project URLs and default values.
- `src/lib/config.js` is now the single source of truth — reads from
  `runtime-config.js`, fills in sensible defaults, warns in dev mode if
  `PUBLIC_SUPABASE_*` is missing.
- `site.js` stripped of the duplicated billing-toggle handler (now owned by
  `pricing-ui.js`).

### Lazy Postgres
- `db.js` no longer opens a connection at import time. Replaced default export
  with `getSql()` / `closeSql()` functions. Importing the module is now free.
- `scripts/test-db.js` updated to use the new API.

### Onboarding
- `src/features/onboarding/bootstrap.js` rewritten to call the
  `bootstrap_workspace` RPC (one transaction) instead of 4 sequential inserts.
- On success, redirects to `./app.html` after a brief status message. Previously
  left the user stranded on the onboarding page.

### Hosting target declared
- `netlify.toml` added — declares `publish = "."` and `functions = "netlify/functions"`.
  Security headers included (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`).
- Functions moved from `functions/` to `netlify/functions/` to match Netlify's
  convention and use Functions v2 (Web API `Request`/`Response`).

### Cleanup
- Deleted `super-cloud.js` and `super-merge.js` — 19KB of legacy prototype sync
  code that predates the SaaS refactor. Flagged in `BACKEND_ARCHITECTURE.md` as
  migration priority #1.

## Dependencies
- Added `@supabase/supabase-js` (^2.45.4) for the auth/db client and the webhook
  function's service-role writes.
- Added `stripe` (^17.5.0) for both serverless functions.
- Bumped version to 0.2.0.
- Added `"engines": { "node": ">=18.17" }` — Netlify Functions v2 and modern
  Stripe SDK both need this.
- Added `npm run dev` (quick local static server) and `npm run build` (runs
  `config:build`, the only build step Netlify needs).

## Documentation
- `DEPLOY.md` rewritten from scratch for the Netlify + Supabase + Stripe setup,
  with a full env var table and a Stripe webhook test walkthrough.
- `SUPABASE_SETUP.md` rewritten — new schema, RPCs, service-role key
  requirement, verification queries.

## Not yet done — next priorities

- `app.html` is still a 157KB monolith. Don't touch it until billing is proven
  in production.
- `src/lib/monitoring.js` and `src/lib/analytics.js` are still console-log
  stubs. Wire real Sentry + PostHog SDKs before public launch or remove them.
- No rate limiting on auth endpoints beyond Supabase built-ins. Add Turnstile
  or hCaptcha before open signups.
- Legal pages still placeholder.
- No automated test suite.

## v0.3.0 — animated practice plans and premium drill workflow

### Practice upgrades
- Added `src/features/practice/practice-engine.js`, a modular practice engine that implements the previously missing `window.BearDenHQ` hooks used by `app.html`.
- Phase 1: animated drill playback now works from current-plan cards and On-Ice Mode through the existing canvas renderer.
- Phase 2: drills are enriched with age levels, skill focus, ice usage, difficulty, player count, equipment, progressions, common mistakes, and animated status.
- Phase 3: practice generation now prioritizes animated drills, supports age-group and goalie-touch options, avoids recent drills, and creates progression-labeled practice blocks.
- Phase 4: the drill-designer path is preserved and tied into plan cards through quick "Edit Diagram" actions, so coaches can improve diagrams directly from a plan.

### Drill library
- Integrated the animated drill library from `data/drills.js` into the main app state via migration.
- Existing preloaded drills now receive animated diagrams when they do not already have one.
- Added a set of premium animated drills to the library while avoiding duplicate names.

### Validation notes
- Parsed the classic inline app scripts with Node successfully.
- `node --check src/features/practice/practice-engine.js` passes.
- `npm run build` was not executed to completion in this environment because dependencies were not installed; direct execution of the build script reports missing `dotenv`.

## v0.3.6 Team Development Tracking

- Added completed-practice logging.
- Added team skill-minutes analysis and next-focus recommendations.
- Added Team Development panel to the Coach Dashboard.
- Added development-aware drill recommendations.
- Added Complete button to current practice plans.
