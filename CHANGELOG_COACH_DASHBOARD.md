# Changelog — v0.3.3 Coach Dashboard

Added a premium Coach Dashboard to make the app feel more like a weekly coaching command center.

## Added

- New `src/features/dashboard/coach-dashboard.js` module.
- Dashboard hero with quick actions:
  - Build Tonight
  - AI Builder
  - Continue Plan
- Coach metrics:
  - Saved plans
  - Animated drills
  - Current plan blocks
  - Suggested next focus
- Recommended drills based on underused skills and recent practice history.
- Favorite drill support from the dashboard.
- Recent practice plan shortcuts.
- Practice shortcut buttons for skating, passing, shooting, compete, breakouts, and goalie work.
- Dashboard actions wire directly into the existing practice generator and Animated Drill Viewer.

## Notes

- This keeps the dashboard modular instead of expanding the existing monolithic app script more than necessary.
- The dashboard degrades gracefully if the animated viewer or planner is unavailable.
