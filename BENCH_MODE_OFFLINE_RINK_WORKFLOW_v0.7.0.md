# BenchBoss Coach HQ v0.7.0 — Bench Mode + Offline Rink Workflow

Bench Mode is designed for the actual rink: unreliable Wi-Fi, cold hands, glare, short drill-reset windows, and a coach who needs giant controls instead of dense menus.

## Coach workflow

1. Open `app.html` while online.
2. Build or load the current practice.
3. Go to Practice → Bench Mode.
4. Press **Preload Practice**.
5. Open **Run Offline Pack** or install/use the PWA shortcut to `bench.html`.
6. At the rink, use the standalone Bench Mode page even if the connection drops.
7. Save quick notes and complete the practice.
8. Open the full app when back online to publish a recap to parents/staff.

## What is cached

- App shell and core pages.
- Current practice plan.
- Full local drill library for offline drill swaps.
- Drill diagrams and sequence metadata.
- Roster snapshot.
- Lineup/game-day snapshot.
- Team branding snapshot.
- Bench settings and quick notes.

## Live adjustments

Bench Mode includes one-tap presets for half ice, full ice, no goalie, low numbers, stations, more compete, simplify, and make harder. The system swaps drills when it finds a better fit in the cached drill library; otherwise, it adds a coaching adaptation note.

## Production notes

- Coaches must preload before leaving reliable connectivity.
- Browser storage limits vary by device; keep imported media/videos lean.
- For public launch, test on the actual devices coaches use at the rink.
- Keep the full app available for cloud publishing, parent portal sync, and manager workflows.
