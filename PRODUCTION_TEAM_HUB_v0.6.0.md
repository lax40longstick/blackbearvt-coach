# BenchBoss Coach HQ v0.6.0 — Production Team Hub Setup

This release adds the production layer for real teams: persistent roster, parent portal, invite roles, published lineups, published practices, team branding persistence, GameSheet history, and SportsEngine link settings.

## 1. Deploy the code

Use GitHub → Netlify deploy.

Netlify settings:

```text
Build command: npm run build
Publish directory: .
Functions directory: netlify/functions
Node version: 20
```

## 2. Add Netlify environment variables

Use `NETLIFY_ENV_TEMPLATE.md`. Required minimum:

```env
PUBLIC_APP_ENV=production
PUBLIC_APP_URL=https://your-domain.com
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o-mini
STRIPE_SECRET_KEY=sk_live_or_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

After adding env vars, use **Clear cache and deploy site** in Netlify.

## 3. Run Supabase SQL

Run these in Supabase SQL Editor:

```text
supabase/schema.sql
supabase/policies.sql
supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql
supabase/migrations/v0.6.0-production-team-hub.sql
```

The v0.6.0 migration adds:

- persistent roster tables
- parent/manager/player roles
- invite tables
- published practice/drill tables
- lineup tables
- external source links
- GameSheet import history
- team branding columns
- Supabase Storage bucket policies for `team-logos`

## 4. Configure Supabase Auth redirects

In Supabase:

```text
Authentication → URL Configuration
```

Set:

```text
Site URL: https://your-domain.com
```

Add redirect URLs:

```text
https://your-domain.com/*
https://your-netlify-site.netlify.app/*
http://localhost:3000/*
http://localhost:8888/*
```

## 5. Test the production role flow

Create three test accounts:

1. Head coach / owner
2. Team manager
3. Parent

Recommended test sequence:

```text
[ ] Owner logs in
[ ] Owner creates workspace/team
[ ] Owner imports or adds roster
[ ] Owner opens Settings → Production Team Hub
[ ] Owner clicks Push Roster
[ ] Owner creates parent invite
[ ] Parent accepts invite
[ ] Parent opens parent.html
[ ] Coach publishes lineup
[ ] Parent sees lineup
[ ] Coach publishes practice
[ ] Parent sees published practice/drills
[ ] Manager saves GameSheet/SportsEngine links
[ ] Parent sees SportsEngine deep links
```

## 6. Production data behavior

The app still keeps a local backup in browser state for speed/offline resilience, but v0.6.0 adds explicit production sync actions:

- **Pull Team Data** loads Supabase roster into the app.
- **Push Roster** upserts the local roster into `team_players`.
- **Publish Lineup** inserts a published row into `team_lineups`.
- **Publish Practice** inserts a published row into `team_practices` and `team_published_drills`.
- **Save Branding** updates the `teams` brand columns.
- **Upload Logo to Supabase** stores the logo in the `team-logos` bucket and saves the public URL.

## 7. SportsEngine integration notes

v0.6.0 does **not** try to replace SportsEngine chat. It supports deep links now:

- SportsEngine roster URL
- SportsEngine chat URL
- SportsEngine schedule URL

The app also includes an API placeholder:

```text
/api/sportsengine-sync
```

That endpoint intentionally returns setup guidance until you have SportsEngine API credentials.

## 8. Parent portal

The parent portal is:

```text
/parent.html
```

Parents must be authenticated and have an active `parent`, `player`, or `viewer` membership.

Visible to parents:

- roster
- published lineups
- published practices/drills
- latest GameSheet stat snapshot
- SportsEngine deep links

Not visible/editable to parents:

- billing
- practice builder
- roster editing
- lineup editing
- team source settings
- invite creation

## 9. Before public launch

Do not launch publicly until you verify:

```text
[ ] RLS blocks parent edits
[ ] Parent cannot view drafts
[ ] Parent can view published lineup/practice only
[ ] Manager can sync roster/source links
[ ] Coach can publish lineup/practice
[ ] Supabase Storage logo upload works
[ ] Stripe test checkout works
[ ] GameSheet import works or CSV fallback works
[ ] Legal/privacy pages reviewed for youth sports data
```
