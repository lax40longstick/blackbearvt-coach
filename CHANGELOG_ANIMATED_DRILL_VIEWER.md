# Changelog — v0.3.2 Animated Drill Viewer

## Added

- Added `src/features/practice/animated-drill-viewer.js`, a reusable animated drill viewer module.
- Added a premium viewer UI with:
  - play / pause / resume controls
  - restart control
  - speed selector
  - current playback status
  - current step label
  - step timeline in full modal mode
  - compact embedded mode for practice-plan cards
- Added full-screen/modal drill preview from the drill library.
- Added compact animated viewers directly inside generated practice-plan blocks.
- Wired the existing `components/diagram.js` playback engine into a higher-level coaching UI.
- Added coach-card detail below the full viewer with description and coaching points.

## Updated

- Practice-plan cards now show a richer animated viewer instead of a bare canvas and one play button.
- Drill library cards now expose an `Animated Viewer` action for drills with diagrams.
- Added global app helpers: `openAnimatedViewer()` and `closeAnimatedViewer()`.
- Registered the new module in `app.html` alongside the existing practice engine and AI practice builder.
- Bumped package version to `0.3.2`.

## Validation

- `node --check src/features/practice/animated-drill-viewer.js` passes.
- Existing browser runtime still owns `window`/DOM integration, so direct Node import is not expected to run outside the browser.
