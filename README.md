# BenchBoss Coach HQ

AI-powered hockey coaching platform for building, running, tracking, and sharing practice plans with animated drills.

## Features

- AI Practice Builder
- Animated Drill Viewer
- Coach Dashboard
- Drill Scoring
- Team Development Tracking
- PDF + public link sharing
- Video + animation + coaching tabs
- Practice marketplace starter
- Stripe billing
- Supabase auth/database
- Netlify Functions backend
- Bench Mode offline rink workflow
- One-tap half-ice/no-goalie/low-number practice adjustments
- Rink-side practice recap capture
- 217-drill animated library across base + elite packs
- SEO landing pages for practice-plan discovery
- Club/director dashboard starter
- Parent-safe roster/source views
- Offline analytics queue for Bench Mode events

## Deploy on Netlify from GitHub

1. Upload the contents of this folder to a GitHub repo.
2. In Netlify, choose **Add new site → Import from GitHub**.
3. Select the repo.
4. Confirm these settings:

```text
Build command: npm run build
Publish directory: .
Functions directory: netlify/functions
```

5. Add environment variables from `NETLIFY_ENV_TEMPLATE.md` in **Netlify → Site configuration → Environment variables**.
6. Deploy.

## Required environment variables

Minimum production variables:

```env
PUBLIC_APP_URL=https://your-site.netlify.app
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=sk_test_or_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o-mini
```

Also add your Stripe price IDs and optional Sentry/PostHog/Turnstile values from `NETLIFY_ENV_TEMPLATE.md`.

## Local development

```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Important upload rule

When uploading to GitHub, upload the **files and folders inside this directory**, not the parent folder itself.

Correct:

```text
app.html
index.html
src/
netlify/
package.json
netlify.toml
```

Wrong:

```text
bear-den-coach-hq-v0.3.7/
```

## Security notes

Do not expose server secrets in frontend code:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `TURNSTILE_SECRET_KEY`

Enable Supabase RLS before public launch.

## v0.6.0 Production Team Hub

This version adds the production team platform layer:

- Persistent Supabase roster, staff, guardians, lineups, practices, published drills, announcements, and source links
- Parent / player / viewer roles
- Manager and coach permissions
- Invite links for parents, managers, assistant coaches, players, and viewers
- Parent portal at `/parent.html`
- Supabase Storage logo upload for persistent team branding
- SportsEngine deep-link settings for roster, schedule, and chat
- GameSheet import history support

Required setup:

```text
supabase/migrations/v0.6.0-production-team-hub.sql
```

See:

```text
PRODUCTION_TEAM_HUB_v0.6.0.md
CHANGELOG_v0.6.0_PRODUCTION_TEAM_HUB.md
```

## v0.7.0 Bench Mode

Bench Mode adds the live rink workflow: preload a practice before the rink, run it with large high-contrast controls, adjust for half-ice/no-goalie/low-number situations, save quick notes, and create a post-practice recap. See `BENCH_MODE_v0.7.0.md` for the full coach workflow and QA checklist.


## v0.10.0 production notes

After deploying, run:

```text
supabase/migrations/v0.10.0-marketability-lift.sql
```

Then verify RLS:

```sql
select * from public.rls_production_check;
```

Pilot materials are included in:

```text
PILOT_PROGRAM_v0.10.0.md
pilot/
```

## v0.11.0 Coach Tablet PWA + Whiteboard

This version shifts the product focus toward a coach mobile/tablet app plus a lighter parent/team portal.

Coach/tablet focus:

- Practice planning
- Offline Bench Mode
- Animated drills
- Lineup builder
- Stats glance
- Whiteboard / draw board

Parent/team focus:

- Published lineups
- Team/player stats
- Published drills
- Schedule/source links
- Team updates and recaps

New routes:

```text
coach.html       tablet/mobile coach launcher
whiteboard.html  standalone full/half-rink coach board
parent.html      lighter parent/team mobile portal
```

Whiteboard features include full/half-rink views, freehand drawing, arrows, players, pucks, cones, eraser/delete, undo/redo, save, duplicate, attach to current practice, export to PNG/PDF, draw over existing drill diagrams, and freeze-frame annotation from animated drills or Bench Mode.

See:

```text
COACH_TABLET_PWA_WHITEBOARD_v0.11.0.md
CHANGELOG_v0.11.0_COACH_TABLET_WHITEBOARD.md
```
