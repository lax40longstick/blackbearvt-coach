# Changelog — v0.3.7-patch.3 Marketplace checkout + Supabase verifier

## Added

- **`netlify/functions/create-marketplace-checkout.js`** — one-time Stripe
  checkout for paid marketplace packs. Verifies the bearer token, looks up
  the plan via service-role, blocks self-purchase, blocks double-buy,
  enforces published-only, and rejects free or unwired plans with clear
  error codes. Uses `Stripe.createFetchHttpClient()` for edge-runtime
  compatibility and testability. Mounted at `/api/create-marketplace-checkout`.

- **`supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql`** —
  `marketplace_purchases` table with:
  - FK to `auth.users` and `marketplace_plans`
  - `stripe_session_id` unique
  - Status check constraint (`pending | paid | refunded | failed`)
  - **Partial unique index** on `(user_id, marketplace_plan_id)` WHERE
    `status = 'paid'` — prevents double-buy without losing pending/failed
    history
  - RLS: `select` policy `user_id = auth.uid()`. No write policies — only
    the service-role webhook writes.

- **`supabase/verify.sql`** — paste-and-run queries for every assertion in
  HUMAN_LAUNCH_PLAN §2. Each section is independent and labeled with the
  expected result.

- Marketplace UI: paid packs now show a `Buy $X.XX` button that POSTs to
  the new function, redirects to Stripe, and toasts on return
  (`?purchase=success` / `?purchase=canceled`). Free packs keep the
  existing `Import` button. Replaced the placeholder `Preview` button.

## Changed

- **`netlify/functions/stripe-webhook.js`** — extended `checkout.session.completed`
  to branch on `session.mode`:
  - `mode = "subscription"` → existing subscription flow (unchanged)
  - `mode = "payment"` + `metadata.purchase_kind = "marketplace_plan"`
    → upserts a row into `marketplace_purchases`
  Added `charge.refunded` handler that flips matching purchases to
  `status = 'refunded'`.

- **`.env.example`** — removed `STRIPE_MARKETPLACE_WEBHOOK_SECRET` (a single
  webhook now handles both subscription and marketplace events).

## Tests

- Added `tests/marketplace-checkout.behavior.mjs` — 11 in-process behavioral
  tests with fetch-level mocks for Supabase + Stripe. Covers method
  rejection, auth, planId validation, all 5 plan-state error paths,
  double-buy block, and verifies the exact metadata sent to Stripe.
- Strengthened `tests/smoke.mjs` with 6 new assertions for the function,
  migration, webhook, and UI changes.
- `npm test` runs **40 checks total** across 4 files.
- `npm run test:marketplace` runs only the marketplace tests.

## Files changed / added

- `netlify/functions/create-marketplace-checkout.js` (new)
- `netlify/functions/stripe-webhook.js`
- `supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql` (new)
- `supabase/verify.sql` (new)
- `src/features/marketplace/practice-marketplace.js`
- `tests/smoke.mjs`
- `tests/marketplace-checkout.behavior.mjs` (new)
- `package.json`
- `.env.example`

## Still requires human setup before this works in prod

See HUMAN_LAUNCH_PLAN §1, §3, §4. Specifically: create a Stripe Product and
Price for each premium pack in the Stripe Dashboard, then update the
matching `marketplace_plans.stripe_price_id` rows in Supabase.
