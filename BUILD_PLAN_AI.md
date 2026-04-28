# Bear Den Coach HQ 30-Day Build Plan For AI Execution

This is the AI-optimized version of the plan. It is structured for direct execution against this repository and prioritizes dependency order, file ownership, and critical path.

## Execution rules

- Preserve the existing workspace in `app.html` unless explicitly replacing it with a migrated app shell
- Do not remove user-facing working behavior unless the replacement is complete
- Prioritize auth and tenant model before billing and pilot polish
- Keep public marketing pages and coach workspace working at all times
- Prefer incremental migration over a large rewrite

## Recommended stack

- Frontend: current static HTML plus gradual migration to `src/` with Vite-compatible structure
- Auth and database: Supabase
- Billing: Stripe
- Monitoring: Sentry
- Analytics: PostHog
- Hosting target: Netlify plus Supabase

## Critical path

1. Product decisions frozen
2. Environment configuration added
3. Supabase auth and tenant bootstrap
4. Protected workspace access
5. Stripe test billing
6. Onboarding flow
7. Monitoring and analytics
8. Pilot support and issue triage

Blocking note:

Do not attempt production billing before tenant ownership and authentication are working.

## Current status

Completed:

- [x] `PRODUCT_SPEC.md`
- [x] `ENTITLEMENTS.md`
- [x] `.env.example`
- [x] `src/main.js`
- [x] `src/lib/config.js`
- [x] `src/lib/supabase.js`
- [x] `src/features/auth/auth.js`
- [x] `src/features/auth/auth-ui.js`
- [x] `src/features/onboarding/bootstrap.js`
- [x] `supabase/schema.sql`
- [x] `supabase/policies.sql`
- [x] `auth.html` integration scaffold
- [x] `onboarding.html` bootstrap form scaffold
- [x] Supabase project URL wired into runtime config
- [x] Supabase anon key wired into current static pages
- [x] Frontend config validation completed
- [x] Local git repo initialized and baseline commit created
- [x] Optional `postgres` utility path added for admin scripting
- [x] Session bootstrap implemented
- [x] Auth-aware redirects implemented
- [x] Protected `account`, `onboarding`, and `app` loading implemented
- [x] `IMPLEMENTATION_PLAN.md`
- [x] `src/features/teams/team-context.js`
- [x] `src/features/account/account.js`
- [x] `src/lib/billing-config.js`
- [x] `src/features/billing/entitlements.js`
- [x] `src/features/billing/checkout.js`
- [x] `src/features/billing/pricing-ui.js`
- [x] `src/lib/monitoring.js`
- [x] `src/lib/analytics.js`
- [x] `src/features/app/workspace-context.js`
- [x] `functions/create-checkout-session.js`
- [x] `functions/stripe-webhook.js`

Pending user inputs:

- [ ] Vendor accounts created
- [ ] Primary buyer confirmation
- [ ] Role scope confirmation

Priority note:

- Use `supabase-js` first for app auth and data
- Treat raw `DATABASE_URL` connectivity as optional admin tooling

## Repo targets

### Existing files to preserve and extend

- `index.html`
- `app.html`
- `pricing.html`
- `auth.html`
- `onboarding.html`
- `account.html`
- `super-cloud.js`
- `super-merge.js`
- `site.css`
- `site.js`
- `manifest.json`
- `sw.js`

### Files to create early

- `PRODUCT_SPEC.md` [done]
- `ENTITLEMENTS.md` [done]
- `IMPLEMENTATION_PLAN.md` [done]
- `.env.example` [done]
- `src/main.js` [done]
- `src/lib/config.js` [done]
- `src/lib/supabase.js` [done]
- `src/lib/billing-config.js`
- `src/lib/monitoring.js` [done]
- `src/lib/analytics.js` [done]
- `src/features/auth/auth.js` [done]
- `src/features/auth/auth-ui.js` [done]
- `src/features/onboarding/bootstrap.js` [done]
- `src/features/onboarding/onboarding-ui.js`
- `src/features/teams/team-context.js`
- `src/features/billing/checkout.js` [done]
- `src/features/billing/entitlements.js` [done]
- `src/features/account/account.js` [done]
- `src/features/roster/import.js`
- `src/features/practice/first-practice.js`
- `supabase/schema.sql` [done]
- `supabase/policies.sql` [done]
- `functions/create-checkout-session.js`
- `functions/stripe-webhook.js`
- `tests/smoke.spec.js`
- `DATA_HANDLING.md`
- `PILOT_FEEDBACK_TEMPLATE.md`
- `PILOT_ISSUES.md`

## Day-by-day execution plan

### Day 1

Objectives:

- Capture product definition inputs
- Freeze buyer and plan structure

Tasks:

- [x] Create `PRODUCT_SPEC.md`
- [x] Create `ENTITLEMENTS.md`
- Update commercialization docs to align with chosen buyer

Requires user:

- Primary buyer choice
- Plan confirmation

### Day 2

Objectives:

- Establish environment and implementation scaffolding

Tasks:

- [x] Create `.env.example`
- Create `IMPLEMENTATION_PLAN.md`
- Expand or align architecture docs if needed

Requires user:

- Vendor account creation started

### Day 3

Objectives:

- Prepare modular app structure without breaking static pages

Tasks:

- [x] Create `src/`
- [x] Create `src/main.js`
- [x] Create `src/lib/`
- [x] Create `src/features/`
- [x] Add non-breaking bootstrapping strategy for existing pages

### Day 4

Objectives:

- Add Supabase configuration layer

Tasks:

- [x] Create `src/lib/config.js`
- [x] Create `src/lib/supabase.js`
- [x] Define configuration contract for auth and database

Requires user:

- Supabase project URL
- Supabase anon key

### Day 5

Objectives:

- Implement auth flow

Tasks:

- [x] Create `src/features/auth/auth.js`
- [x] Create `src/features/auth/auth-ui.js`
- [x] Update `auth.html`
- [x] Update `site.js` if shared UI logic is needed

### Day 6

Objectives:

- Add session bootstrap and protected entry logic

Tasks:

- Connect auth state to `auth.html`, `account.html`, and `app.html`
- Redirect unauthenticated users appropriately

Status:

- [x] Implemented
- Redirects and protected page access are active

### Day 7

Objectives:

- Build post-signup organization and team bootstrap

Tasks:

- [x] Create `src/features/onboarding/bootstrap.js`
- [x] Update `onboarding.html`

Requires user:

- Desired team creation defaults

### Day 8

Objectives:

- Define persistence model

Tasks:

- [x] Create `supabase/schema.sql`
- [x] Create `supabase/policies.sql`
- Document tenant assumptions

Status:

- [x] Table and RLS scaffold complete
- [ ] Live database application still depends on user-side Supabase setup

Requires user:

- Role permission approval

### Day 9

Objectives:

- Replace manual sync assumptions with tenant-aware logic

Tasks:

- Update `super-cloud.js`
- Create `src/features/teams/team-context.js`
- Ensure team membership drives data paths

### Day 10

Objectives:

- Protect workspace and account routes

Tasks:

- Update `account.html`
- Update `app.html`
- Verify manifest and service worker assumptions still hold

Status:

- [x] Session-gated access added for `account.html` and `app.html`
- [ ] Tenant-aware data hydration still pending

### Day 11

Objectives:

- Prepare billing configuration

Tasks:

- [x] Create `src/lib/billing-config.js`
- Update `pricing.html`

Requires user:

- Stripe product and price IDs

### Day 12

Objectives:

- Launch checkout flow

Tasks:

- [x] Create `src/features/billing/checkout.js`
- [x] Update `pricing.html`
- [x] Update `account.html`

### Day 13

Objectives:

- Add server-side billing hooks

Tasks:

- Create `functions/create-checkout-session.js`
- Create `functions/stripe-webhook.js`

Requires user:

- Stripe secret key
- Stripe webhook secret

### Day 14

Objectives:

- Enforce subscription entitlements

Tasks:

- [x] Create `src/features/billing/entitlements.js`
- Gate account and team capabilities by plan

Status:

- [x] Entitlement model scaffolded
- [ ] Live subscription enforcement still depends on Stripe and backend state

### Day 15

Objectives:

- Build first-run onboarding UI

Tasks:

- Create `src/features/onboarding/onboarding-ui.js`
- Update `onboarding.html`

### Day 16

Objectives:

- Build roster setup path

Tasks:

- Create `src/features/roster/import.js`
- Update `app.html` or onboarding handoff flow

Requires user:

- Sample roster CSV if import is needed

### Day 17

Objectives:

- Connect onboarding to first practice success moment

Tasks:

- Create `src/features/practice/first-practice.js`
- Update `super-merge.js` if integration is needed

### Day 18

Objectives:

- Improve account page with real customer operations data

Tasks:

- [x] Create `src/features/account/account.js`
- [x] Update `account.html`

### Day 19

Objectives:

- Add monitoring

Tasks:

- [x] Create `src/lib/monitoring.js`
- Wire Sentry initialization into `src/main.js`

Requires user:

- Sentry DSN

### Day 20

Objectives:

- Add analytics

Tasks:

- [x] Create `src/lib/analytics.js`
- Track:
  - signup started
  - signup completed
  - onboarding completed
  - first practice saved
  - invite sent
  - checkout started

Requires user:

- PostHog project key

### Day 21

Objectives:

- Harden data handling and launch docs

Tasks:

- Create `DATA_HANDLING.md`
- Update deployment and launch docs

### Day 22

Objectives:

- Add smoke test coverage

Tasks:

- Create `tests/smoke.spec.js`
- Cover auth, onboarding, billing state, and plan save behavior where feasible

### Day 23

Objectives:

- Resolve first manual QA issues

Tasks:

- Patch high-friction defects found by user testing

Requires user:

- Desktop and mobile QA results

### Day 24

Objectives:

- Remove remaining prototype-level copy

Tasks:

- Update `index.html`
- Update `pricing.html`
- Update `auth.html`

### Day 25

Objectives:

- Prepare pilot workflow assets

Tasks:

- Create `PILOT_FEEDBACK_TEMPLATE.md`
- Update `PILOT_PROGRAM.md`

### Day 26

Objectives:

- Support pilot onboarding

Tasks:

- Fix urgent onboarding and trust issues reported by pilot users

Requires user:

- Pilot user access and notes

### Day 27

Objectives:

- Convert pilot notes into an actionable backlog

Tasks:

- Create `PILOT_ISSUES.md`
- Categorize `must fix`, `should fix`, `later`

### Day 28

Objectives:

- Execute must-fix pilot work

Tasks:

- Patch highest-impact issues only

### Day 29

Objectives:

- Finalize legal page swap

Tasks:

- Update `privacy.html`
- Update `terms.html`

Requires user:

- Approved legal copy

### Day 30

Objectives:

- Final launch readiness pass

Tasks:

- Update launch docs
- Verify public pages, account flow, and workspace continuity
- Confirm `pilot-only` or `public launch` state in docs

## AI task ownership map

### User-only tasks

- Choose buyer and pricing
- Create vendor accounts
- Provide API keys and project IDs
- Approve legal text
- Test on real devices
- Recruit and manage pilots

### AI-executable tasks

- Create and edit repo files
- Implement auth flow
- Implement billing flow
- Implement onboarding and account pages
- Refactor toward modular frontend structure
- Add monitoring and analytics hooks
- Write docs and triage pilot issues

## Immediate next action

Start with:

1. `PRODUCT_SPEC.md`
2. `ENTITLEMENTS.md`
3. `.env.example`
4. `src/lib/config.js`
5. `src/lib/supabase.js`
6. `auth.html` integration

This is the highest-leverage sequence because it unlocks all later work.
