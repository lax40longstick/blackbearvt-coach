# Changelog — v0.3.7 Launch Readiness + Marketplace + Media

## Added

- Drill media tabs: Animation, Video, Coaching Points.
- YouTube/Vimeo demo video URL normalization and safe embed support.
- Practice Marketplace page and module with free pack import flow.
- Marketplace Supabase tables for published plans and reviews.
- AI production guards: prompt safety validation, per-minute rate limiting, monthly usage limits by subscription plan, and generation logging.
- Browser monitoring scaffold wired to Sentry.
- Product analytics scaffold wired to PostHog.
- Cloudflare Turnstile frontend hook for signup and magic-link forms.
- Legal pages: Terms, Privacy, Refund, Contact.
- Node smoke tests covering critical files, AI guards, sharing, and marketplace schema.
- Human launch plan for required real-world setup.

## Still requires human setup

- Real OpenAI, Sentry, PostHog, Turnstile, Stripe marketplace, and production Supabase configuration.
- Legal review before public launch.
- Gradual `app.html` decomposition.
