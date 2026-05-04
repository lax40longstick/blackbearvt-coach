# Netlify Environment Variables

Add these in Netlify under **Site configuration → Environment variables**.

## Public browser variables

```env
PUBLIC_APP_ENV=production
PUBLIC_APP_URL=https://your-site.netlify.app
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_xxxxx
PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

## Server-only variables

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=sk_test_or_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o-mini
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

## Stripe price IDs

```env
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxxxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxxxx
STRIPE_PRICE_TEAM_ANNUAL=price_xxxxx
STRIPE_PRICE_CLUB_MONTHLY=price_xxxxx
STRIPE_PRICE_CLUB_ANNUAL=price_xxxxx
```

## Optional analytics and monitoring

These are public browser keys and must use the `PUBLIC_` prefix because `runtime-config.js` is generated at build time.

```env
PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
PUBLIC_POSTHOG_KEY=phc_xxxxx
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

After adding or changing environment variables, trigger a fresh Netlify deploy.

## Production Team Hub v0.6.0 additions

```env
# GameSheet scheduled/manual importer
GAMESHEET_SYNC_URLS=[{"url":"https://gamesheetstats.com/seasons/10754/scores?filter%5Bdivision%5D=overall","teamName":"Black Bears Youth 12U T2","teamId":"YOUR_SUPABASE_TEAM_UUID"}]
GAMESHEET_REFRESH_SCHEDULE=@daily

# SportsEngine API sync placeholder - only add after SportsEngine grants API access
SPORTSENGINE_CLIENT_ID=your_sportsengine_client_id
SPORTSENGINE_CLIENT_SECRET=your_sportsengine_client_secret
SPORTSENGINE_API_BASE_URL=https://api.sportsengine.com
```

Production Team Hub also requires the SQL migration:

```text
supabase/migrations/v0.6.0-production-team-hub.sql
```


## v0.10.0 production hardening

After the v0.6.0 migration, also run:

```text
supabase/migrations/v0.10.0-marketability-lift.sql
```

This adds the Free tier plan key, parent-safe roster/source views, forced RLS, and the `rls_production_check` verification view.
