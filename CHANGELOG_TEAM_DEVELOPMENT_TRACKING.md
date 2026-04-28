# Changelog — v0.3.6 Team Development Tracking

Adds the team-development loop that turns Bear Den Coach HQ from a practice builder into a season-aware coaching assistant.

## Added

- `src/features/practice/team-development-tracking.js`
  - Tracks completed practices in `state.development.completedPractices`.
  - Summarizes skill minutes by category across completed practices.
  - Recommends the next practice focus based on under-trained skills.
  - Generates development-aware drill recommendations using the existing drill scoring engine.
  - Updates drill usage and `lastUsedAt` when a practice is marked complete.

## Dashboard

- Added a Team Development panel to the Coach Dashboard.
- Shows:
  - recommended next focus,
  - completed practice count,
  - skill-minutes distribution,
  - one-click button to build a practice for the next recommended focus.
- Coach Dashboard recommendations now prefer the team-development next focus when tracking data exists.

## Practice workflow

- Added a `Complete` button to the Current Plan toolbar.
- Completing a practice logs it to the development tracker, updates drill usage, refreshes the dashboard, and persists to local storage.

## Notes

- This version uses local app state/localStorage for tracking so it works immediately offline and without new Supabase migrations.
- A future production upgrade should sync completed practices to Supabase for multi-device/team collaboration.
