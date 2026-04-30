# Changelog — v0.5.2 "GameSheet production imports"

## Added
- Production-oriented GameSheet parser module shared by functions.
- Public GameSheet page parser with diagnostics and warnings.
- CSV/TSV stat import endpoint, not just browser-only parsing.
- Import snapshots/history in Team Hub state.
- Error history and user-visible import diagnostics.
- Netlify scheduled/manual refresh function (`gamesheet-refresh`).
- Supabase table documentation for persisted import runs.
- Team stat summary with record/goals for/goals against where public data is parseable.

## Notes
- GameSheet pages can be client-rendered or change markup. When public HTML has no tables, the app now clearly tells the coach/manager to use a stats page URL or CSV/TSV export fallback.
- Server-side persistence requires `SUPABASE_SERVICE_ROLE_KEY` and the optional `gamesheet_import_runs` table.
