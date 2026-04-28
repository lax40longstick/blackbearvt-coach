# Changelog — v0.3.5 "practice sharing that coaches use"

## Sharing — PDF + public link

- Added `src/features/sharing/practice-sharing.js` with a reusable sharing layer.
- Added public `practice.html` viewer for shared practice links.
- Added Share and PDF buttons to the Current Plan panel.
- Share flow saves the current plan to Supabase, marks it public, copies the link, and opens a share modal.
- PDF export uses jsPDF and exports a clean bench-ready practice plan with blocks, minutes, objectives, coaching notes, freeze moments, and score metadata.
- Shared plan payload includes stable drill names/content so links remain readable even if the local drill library changes.
- Added mobile-native share fallback with clipboard copy.
- Added print styles for public shared plans.

## Supabase

- Added `practice_plans` table with RLS.
- Owners can create/update/delete their plans.
- Public plans can be read by anyone with the link.

## Version

- Bumped package version to `0.3.5`.
