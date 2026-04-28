# Changelog — v0.3.4 Drill Scoring

Added a coach-facing drill scoring layer across the app.

## Added
- `src/features/practice/drill-scoring.js`
  - Overall drill score out of 10
  - Age fit, difficulty, fun, setup, goalie use, efficiency, and animation value sub-scores
  - Coach-friendly score labels and recommendation reasons
  - Practice-level scoring helpers
  - Score-based recommendation helper for dashboard ranking
- Drill Library cards now show a score badge.
- Current Practice blocks now show a full scoring panel with reason and sub-scores.
- Coach Dashboard recommendations now use score-based ranking when available.
- AI Practice Builder annotates generated plans with practice score metadata and per-drill score summaries.

## Notes
- Scoring is deterministic and runs locally in the browser.
- It uses existing drill metadata first, then falls back to drill text/tags/category heuristics.
- This is designed to make drill selection faster and improve the quality of AI-generated and dashboard-recommended practices.
