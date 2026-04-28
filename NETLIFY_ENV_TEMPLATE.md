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

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
POSTHOG_API_KEY=phc_xxxxx
POSTHOG_HOST=https://app.posthog.com
```

After adding or changing environment variables, trigger a fresh Netlify deploy.
