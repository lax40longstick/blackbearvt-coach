# Human Launch Plan — v0.3.7

These items cannot be fully completed inside the ZIP because they require real external accounts, keys, legal approval, Stripe product setup, or production database access.

## 1. Environment variables
Add these in Netlify → Site configuration → Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini` or preferred production model
- `AI_RATE_LIMIT_PER_MINUTE=8`
- `PUBLIC_POSTHOG_KEY`
- `PUBLIC_POSTHOG_HOST`
- `PUBLIC_SENTRY_DSN`
- `PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05`
- `PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- Stripe marketplace price/product IDs once premium packs are real

Then redeploy.

## 2. Supabase migrations
Apply `supabase/schema.sql`, then `supabase/policies.sql`. Verify:

- `practice_plans` private/public RLS still works
- `ai_generation_logs` can be inserted only by service role and read by owner
- `marketplace_plans` only exposes published plans to non-authors
- `marketplace_reviews` prevents duplicate reviews per user/plan

## 3. OpenAI production verification
Test each plan tier:

- Starter: limited generations/month
- Team: higher limit
- Club: highest limit

Confirm unsafe prompts are rejected and normal hockey prompts generate plans.

## 4. Stripe marketplace setup
Create products/prices for premium packs. Wire `marketplace_plans.stripe_price_id` to the Stripe Price ID. Add a checkout function for one-time marketplace purchases before selling paid content.

## 5. Legal review
Have counsel review:

- `terms.html`
- `privacy.html`
- `refund.html`
- AI disclaimer language
- marketplace author/content terms
- youth sports safety disclaimer

## 6. Monitoring and analytics QA
Confirm in production:

- Sentry receives browser errors
- PostHog receives `practice_generated`, `pdf_exported`, `share_link_created`, `drill_favorited`, `marketplace_plan_imported`
- No sensitive player data is sent in analytics payloads

## 7. app.html refactor plan
The app still works, but `app.html` remains too large. Refactor safely in this order:

1. Move global state helpers into `src/features/app/app-state.js`
2. Move roster/stat rendering into `src/features/roster/`
3. Move practice plan rendering into `src/features/practice/practice-ui.js`
4. Move game-day packet into `src/features/game-day/`
5. Keep `app.html` as shell only

Do one section per release with smoke tests after each extraction.
