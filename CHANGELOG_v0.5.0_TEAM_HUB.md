# Changelog — v0.5.0 Team Hub v1

Adds the first version of Bear Den Coach HQ as an all-team workspace instead of only a practice builder.

## Added

- Team Hub parent/manager dashboard on the main app dashboard.
- SportsEngine roster import seed based on the uploaded Black Bears Youth 12U T2 roster PDF.
- Staff import seed for team managers, coaches, and general staff.
- Roster import panel with replace/merge modes.
- Published practices panel for parents.
- Publish current practice to Team Hub action.
- GameSheet public URL setting.
- Netlify `gamesheet-import` function that safely reads public `gamesheetstats.com` pages and extracts score rows where available.
- CSV paste fallback for GameSheet stat exports.
- GameSheet stat dashboard with imported games, imported player stat rows, and a parent-friendly stat table.

## Integration strategy

This version does not try to replace SportsEngine or GameSheet. It uses them as source systems:

- SportsEngine remains roster/chat/source-of-truth for team communications.
- GameSheet remains the scoring/stats source of truth.
- Bear Den Coach HQ becomes the coaching layer: practices, published drills, lineups, stat summaries, and development context.

## Human setup still needed

- If you can get official SportsEngine API access, replace the PDF seed with an authenticated roster sync.
- If GameSheet provides an export/API for your league, wire that into the importer instead of relying on public HTML parsing or CSV paste.
- Confirm parent privacy rules before exposing player DOBs, phones, or staff phone numbers in parent-facing views.
