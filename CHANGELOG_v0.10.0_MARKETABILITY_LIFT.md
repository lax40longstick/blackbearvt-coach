# BenchBoss Coach HQ v0.10.0 — Marketability Lift

## Added

- Merged v0.8.0 drill-pack/pricing updates into the full production app.
- Merged v0.9.0 SEO/director updates into the full production app.
- Added `data/elite-drills-pack-3.js` with 60 more quality drills.
- Practice engine now loads original elite pack + pack 2 + pack 3.
- AI payload now sends up to 180 best-fit drills instead of 120.
- Service worker caches pack 2, pack 3, Club page, and SEO landing pages.
- Added analytics events:
  - `practice_generated`
  - `bench_mode_opened`
  - `drill_swapped`
  - `practice_completed`
  - `parent_recap_viewed`
- Added offline analytics queue for standalone Bench Mode.
- Added v0.10.0 RLS hardening migration.
- Added parent-safe roster/source-link views.
- Added pilot program kit for recruiting and running 3-5 coach beta.

## Security

- Added `force row level security` for client-exposed production tables.
- Parents/viewers no longer query full `team_players` rows directly.
- Parents/viewers use sanitized views:
  - `team_player_public_cards`
  - `team_public_source_links`
- Membership read policy tightened so parents/players/viewers only read their own membership unless they are manager/coach/admin.

## Human-required item

A real pilot cannot be run from code. The package includes the pilot runbook, feedback form, recruitment email, and scorecard, but you still need to recruit coaches and collect live feedback.
