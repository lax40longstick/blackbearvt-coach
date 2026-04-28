# Bear Den Coach HQ — Deployment Guide

This is a static frontend + two Netlify serverless functions + Supabase (auth + database).

## Architecture at a glance

```text
Browser (static HTML/JS)
  ├── auth/session via supabase-js   →  Supabase
  ├── DB reads/writes via supabase-js →  Supabase (enforced by RLS)
  └── POST /api/create-checkout-session
        └── Netlify Function  →  Stripe Checkout  →  user redirected

Stripe  →  POST /api/stripe-webhook  →  Netlify Function  →  Supabase
```

## Folder contents

```text
bear-den-coach-hq/
├── index.html            public marketing
├── app.html              coach workspace (PWA shell)
├── pricing.html          plans + Stripe Checkout entry
├── auth.html             sign in / sign up
├── onboarding.html       create org + team (uses bootstrap_workspace RPC)
├── account.html          profile + billing status
├── privacy.html, terms.html
├── site.css, site.js     global styles and entry
├── runtime-config.js     generated from .env by `npm run config:build`
├── manifest.json, sw.js  PWA
├── src/                  feature modules
├── supabase/             SQL schema + RLS policies
├── netlify/functions/    serverless billing endpoints
├── netlify.toml          Netlify config (functions dir + security headers)
└── scripts/              build + admin scripts
```

## Recommended host: Netlify

This project is wired for **Netlify Functions v2** out of the box. The included
`netlify.toml` tells Netlify to serve static files from the repo root and load
functions from `netlify/functions/`.

### One-time setup

1. Push this folder to a Git repo (GitHub / GitLab).
2. In Netlify: **Add new site → Import from Git → select the repo.**
3. Build settings: leave the defaults — `netlify.toml` handles it.
4. Set environment variables (Site settings → Environment variables). See next section.
5. Deploy.

### Environment variables (set in Netlify UI)

**Publishable — shipped to browser via `runtime-config.js`:**

| Var | Value |
|---|---|
| `PUBLIC_APP_ENV` | `production` |
| `PUBLIC_APP_URL` | `https://your-domain.com` |
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` or `pk_test_…` |
| `PUBLIC_POSTHOG_KEY` | optional |
| `PUBLIC_SENTRY_DSN` | optional |

**Server-side secrets — never sent to the browser:**

| Var | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` or `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the Stripe CLI or Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | required — webhook bypasses RLS to write subscription state |
| `OPENAI_API_KEY` | required for AI Practice Builder live generation |
| `OPENAI_MODEL` | optional, defaults to `gpt-4o-mini` |
| `STRIPE_PRICE_STARTER_MONTHLY` | price id from Stripe Dashboard |
| `STRIPE_PRICE_STARTER_ANNUAL` | " |
| `STRIPE_PRICE_TEAM_MONTHLY` | " |
| `STRIPE_PRICE_TEAM_ANNUAL` | " |
| `STRIPE_PRICE_CLUB_MONTHLY` | " |
| `STRIPE_PRICE_CLUB_ANNUAL` | " |

### Build command

Netlify auto-runs `npm run build`, which runs `scripts/generate-runtime-config.js`
to produce `runtime-config.js` from the `PUBLIC_*` env vars. That file is what
the browser loads — no secrets are shipped.

### Routes

Netlify Functions v2 uses in-file path config:

- `POST /api/create-checkout-session` → `netlify/functions/create-checkout-session.js`
- `POST /api/ai-practice-builder` → `netlify/functions/ai-practice-builder.js`
- `POST /api/stripe-webhook` → `netlify/functions/stripe-webhook.js`

## Stripe configuration

1. Create a product for each plan (Starter, Team, Club) in the Stripe Dashboard.
2. Give each one both a monthly and an annual price.
3. Copy the 6 price IDs into the Netlify env vars above.
4. In **Developers → Webhooks**, add an endpoint pointed at
   `https://your-domain.com/api/stripe-webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
   - `invoice.payment_failed`
5. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Testing webhooks locally

```bash
npm install --global stripe
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe-webhook
# Copy the printed whsec_... into your local .env as STRIPE_WEBHOOK_SECRET
```

## Supabase configuration

See `SUPABASE_SETUP.md` for the detailed walkthrough. Summary:

1. Apply `supabase/schema.sql` in the SQL editor.
2. Apply `supabase/policies.sql`.
3. Under **Authentication → URL configuration**, add your domain as a redirect URL.
4. Copy the project URL + anon key into Netlify `PUBLIC_SUPABASE_*` vars.
5. Copy the service-role key into `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

## Local development

```bash
npm install
cp .env.example .env   # fill in your values
npm run config:build    # generates runtime-config.js
npm run dev             # serves at http://localhost:3000
```

For function testing locally, install the Netlify CLI (`npm i -g netlify-cli`)
and run `netlify dev` instead of `npm run dev`.

## Before first paying customer

1. Switch Stripe from test to live mode (new `pk_live_` + `sk_live_` + webhook).
2. Confirm RLS policies are enabled on every table (`supabase/policies.sql`).
3. Replace placeholder legal pages with reviewed text.
4. Wire real Sentry + PostHog (the stubs in `src/lib/monitoring.js` and `analytics.js` just log).
5. Smoke-test signup → onboarding → checkout → webhook-confirmed subscription end-to-end.

## What's preserved in `app.html`

Your existing coach workspace is untouched in `app.html` — practice generation,
drill library, on-ice mode, weekly/game planning. All the SaaS scaffolding runs
in parallel on the other pages until you're ready to migrate the workspace.
