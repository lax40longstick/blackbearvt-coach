# BenchBoss Coach HQ v0.7.0 — Bench Mode + Offline Rink Workflow

## Why this exists

Bench Mode is designed for the actual rink: unreliable Wi-Fi, cold batteries, wet hands, glare, and coaches who need to change practice in seconds.

## Coach workflow

1. Build or load a practice.
2. Open the Practice page.
3. Use **Preload Practice** in the Bench Mode panel before leaving for the rink.
4. At the rink, tap **Start Bench Mode** or **Run Offline Pack**.
5. Use the large timer, next/previous buttons, diagram playback, freeze-point buttons, and live adjustments.
6. Save notes during each drill.
7. At the end, save or publish a recap.

## Offline pack contents

The offline pack is stored on the device in localStorage and supported by service-worker cache:

- practice plan
- current drill data and animation sequences
- roster snapshot
- lineup snapshot
- Game Day snapshot
- team branding snapshot
- app shell and key modules

## One-tap live adjustments

- **Half Ice**: tightens spacing and swaps obvious full-ice drills where possible.
- **Full Ice**: adds transition-distance coaching note.
- **No Goalie**: swaps goalie-dependent drills where possible and adds target-zone notes.
- **Low Numbers**: shortens/retools blocks for smaller groups.
- **Stations**: labels blocks as stations and uses station-friendly drill selection.
- **Compete More**: biases toward battles and small-area games.
- **Simplify**: avoids advanced drills and adds walk-through/freeze guidance.
- **Make Harder**: adds pressure/time/score constraints.

## Production notes

- Browser storage can be cleared by the device/browser. For the most reliable experience, preload again before every practice.
- PWA offline caching depends on the site being loaded at least once after deployment.
- Wake Lock and vibration support vary by browser/device.
- Parent recap publishing requires Supabase production team context and coach/manager permissions.

## Future premium/native roadmap

- Native iPad drawing mode with Apple Pencil-quality markup.
- Rugged Android / glove-touch optimized native mode.
- Voice-note capture.
- Offline sync queue to Supabase once connection returns.
- Association director templates that can be preloaded by every team.
