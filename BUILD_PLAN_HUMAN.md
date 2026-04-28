# Bear Den Coach HQ 30-Day Build Plan

This is the human version of the plan. It is optimized for decision-making, weekly progress checks, and knowing what you need to do versus what the coding agent can do.

## Recommended stack

- Frontend: current static app, then gradual migration to Vite
- Auth and database: Supabase
- Billing: Stripe
- Error monitoring: Sentry
- Analytics: PostHog
- Hosting: Netlify for frontend plus Supabase for backend

## Most important first task

Start here immediately:

1. Create accounts for Supabase, Stripe, Sentry, and PostHog
2. Decide your first buyer: solo coach or team staff
3. Keep the first implementation focus on auth plus team membership

Reason:

Without real auth and tenant ownership, billing, onboarding, and pilot rollout are blocked.

## Current status

Completed by agent:

- [x] Public product shell and pricing/account/onboarding pages
- [x] `PRODUCT_SPEC.md`
- [x] `ENTITLEMENTS.md`
- [x] `.env.example`
- [x] `src/` bootstrap structure
- [x] Supabase config client scaffolding
- [x] Auth page scaffolding for signup, sign-in, magic link, and password reset
- [x] Supabase schema scaffold
- [x] Supabase RLS policy scaffold
- [x] Organization and team bootstrap flow scaffold
- [x] Real Supabase project URL wired into frontend runtime config
- [x] Supabase anon key wired into current static frontend pages
- [x] Frontend Supabase config path sanity-checked
- [x] Local git repo initialized with baseline commit
- [x] Optional direct Postgres utility scaffold added
- [x] Session bootstrap added
- [x] Auth-aware redirects added
- [x] Protected account, onboarding, and app loading added
- [x] `IMPLEMENTATION_PLAN.md`
- [x] Tenant context loader scaffold
- [x] Account page tenant hydration scaffold
- [x] Billing config scaffold
- [x] Entitlements scaffold
- [x] Pricing checkout scaffold
- [x] Monitoring wrapper scaffold
- [x] Analytics wrapper scaffold
- [x] Workspace tenant hydration scaffold
- [x] Stripe function scaffolds

Still waiting on you:

- [ ] Create vendor accounts
- [ ] Provide Supabase anon key
- [ ] Confirm primary buyer and v1 role scope

Current focus:

- `supabase-js` auth and tenant loading are on the critical path
- direct Postgres access is optional utility work, not launch-blocking

## What you own

- Product and pricing decisions
- Business name, support email, and branding direction
- Vendor account creation
- Legal review
- Testing on real devices
- Pilot recruitment and customer feedback

## What the coding agent owns

- Repo structure and implementation
- Auth, billing, onboarding, and account flows
- Public product pages
- Monitoring and analytics hooks
- Deployment docs, checklists, and pilot materials
- Fixes based on pilot feedback

## Week 1: Lock the foundation

### Day 1

You:

- Choose primary buyer: `solo coach`, `team staff`, or `club director`
- Confirm plans: `Starter`, `Team`, `Club`
- Confirm support email and business name

Agent:

- [x] Create `PRODUCT_SPEC.md`
- [x] Create `ENTITLEMENTS.md`

### Day 2

You:

- Create Supabase, Stripe, Sentry, and PostHog accounts
- Save project URLs, keys, and dashboard links

Agent:

- [x] Create `.env.example`
- [x] Refine architecture docs

### Day 3

You:

- Choose hosting path
- Decide whether assistant and manager roles are included in v1

Agent:

- [x] Create `IMPLEMENTATION_PLAN.md`
- [x] Finalize milestone order

### Day 4

You:

- Confirm logo direction, product tone, and brand language

Agent:

- [x] Tighten copy in public and account pages

### Day 5

You:

- Review the proposed implementation scope before integration work starts

Agent:

- [x] Start codebase restructuring for maintainability

### End of week 1 success check

- Buyer is chosen
- Pricing is chosen
- Stack is chosen
- Vendor accounts exist
- Build scope is stable

## Week 2: Real authentication and team ownership

### Day 6

You:

- Provide Supabase project details

Agent:

- [x] Add Supabase client setup
- [x] Add auth bootstrap

### Day 7

You:

- Test signup and login with your email

Agent:

- [x] Build signup, login, logout, and reset-password flow

### Day 8

You:

- Confirm team creation flow after signup

Agent:

- [x] Build organization and team bootstrap

### Day 9

You:

- Confirm exact role permissions

Agent:

- [x] Add roles: `owner`, `head_coach`, `assistant`, `manager`, `director`
- [x] Add membership model

### Day 10

You:

- Test protected access across auth, onboarding, account, and app flow

Agent:

- [x] Protect workspace access by signed-in session
- Remove dependence on manual team-code assumptions

### End of week 2 success check

- Supabase runtime config is live in the frontend
- Team ownership model exists
- Roles are defined
- Protected workspace access is in place
- Tenant-aware data loading is the next active implementation step

## Week 3: Billing and customer operations

### Day 11

You:

- Create Stripe products and prices in test mode

Agent:

- Add billing config map

### Day 12

You:

- Provide Stripe test keys

Agent:

- Build checkout launch flow

### Day 13

You:

- Provide Stripe webhook details

Agent:

- Add webhook handling files and subscription sync logic

### Day 14

You:

- Approve upgrade and downgrade behavior

Agent:

- Implement entitlement rules by plan

### Day 15

You:

- Test billing state display in account flow

Agent:

- Improve billing and subscription management UI

### End of week 3 success check

- Billing scaffold exists
- Plans map to entitlement logic
- Account page reflects tenant and plan scaffolding
- Live Stripe wiring is the next billing step

## Week 4: Onboarding, quality, and pilot prep

### Day 16

You:

- Describe your ideal first-run coach workflow

Agent:

- Build guided onboarding

### Day 17

You:

- Provide a sample roster CSV if you want import in v1

Agent:

- Build roster import or structured manual setup flow

### Day 18

You:

- Confirm desired first-practice experience

Agent:

- Connect onboarding to first practice generation

### Day 19

You:

- Provide Sentry and PostHog project details

Agent:

- Add monitoring and analytics hooks

### Day 20

You:

- Test app on phone and desktop

Agent:

- Add smoke tests
- Fix obvious friction points

### Day 21

You:

- Recruit 3 to 5 pilot users

Agent:

- Prepare pilot materials and feedback templates

### End of week 4 success check

- New customer can onboard without manual config
- Monitoring exists
- Pilot package is ready

## Days 22 to 30: Pilot sprint

### Day 22

You:

- Start pilot onboarding

Agent:

- Support fixes for onboarding friction

### Day 23

You:

- Collect usage notes from pilots

Agent:

- Triage issues into `must fix`, `should fix`, `later`

### Day 24

You:

- Confirm which pilot issues matter commercially

Agent:

- Fix the highest-value issues

### Day 25

You:

- Review product copy and pricing clarity

Agent:

- Polish public and account-facing wording

### Day 26

You:

- Validate whether coaches understand the offer

Agent:

- Adjust onboarding and messaging if needed

### Day 27

You:

- Prepare final legal review request

Agent:

- Organize legal placeholders for swap-in

### Day 28

You:

- Deliver approved legal text if available

Agent:

- Replace placeholder legal text

### Day 29

You:

- Decide `pilot-only` or `public launch`

Agent:

- Run final launch pass

### Day 30

You:

- Approve launch checklist

Agent:

- Finalize release docs and cleanup

## Definition of ready to sell

- Users can sign up without manual configuration
- Each customer’s team data is isolated correctly
- Billing works end to end
- Customers can recover or export data
- Errors are monitored
- Legal pages are real
- At least 3 pilot users completed real workflows

## Files expected to be created or changed early

Create:

- `PRODUCT_SPEC.md`
- `ENTITLEMENTS.md`
- `IMPLEMENTATION_PLAN.md`
- `.env.example`
- `src/main.js`
- `src/lib/config.js`
- `src/lib/supabase.js`
- `src/features/auth/auth.js`
- `src/features/onboarding/bootstrap.js`
- `supabase/schema.sql`
- `supabase/policies.sql`

Change:

- `auth.html`
- `onboarding.html`
- `account.html`
- `app.html`
- `super-cloud.js`
- `manifest.json`
- `sw.js`

## If you only do one thing today

Create the Supabase and Stripe accounts, then start the auth plus tenant work first.
