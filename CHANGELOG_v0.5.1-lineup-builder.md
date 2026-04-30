# Changelog — v0.5.1 Lineup Builder v1

Added a production-ready game-day lineup builder to Team Hub.

## Added
- Game-specific lineup card save/load/delete.
- Uses current forward lines, defensive pairs, goalie, and PP/PK/EV/Extra tags.
- Scratch/absent/injured/discipline tracking per player.
- Printable lineup card with team, date, opponent, lines, unavailable players, and notes.
- Copy-to-clipboard share text for assistant coaches/team managers.
- Preview card inside the Lines page.
- Saved lineup cards also appear in the Game Day line-config selector.

## Notes
- This version is client/local-state first, matching the current app architecture.
- Supabase persistence can be added later by storing `teamHub.lineups` in a `lineups` table.
