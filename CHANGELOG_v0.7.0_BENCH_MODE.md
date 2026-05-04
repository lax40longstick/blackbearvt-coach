# Changelog — v0.7.0 Bench Mode + Offline Rink Workflow

Built the rink-first workflow recommended by the market research report: a fast, offline-first practice mode for real bench conditions.

## Added

- Bench Mode panel inside the practice workspace.
- Offline Practice Pack that stores the current plan, roster snapshot, lineup data, team branding, and the full local drill library for live drill swaps.
- Service worker app-shell cache with Bench Mode assets, app pages, core modules, drill libraries, icons, and branding assets.
- Standalone `bench.html` page for rink use after preloading.
- Standalone offline renderer for current block, coaching points, diagram steps, quick notes, timer, and recap.
- High-contrast / large-control rink interface.
- One-tap adjustment presets:
  - Half Ice
  - Full Ice
  - No Goalie
  - Low Numbers
  - Stations
  - Compete More
  - Simplify
  - Make Harder
- Live drill swap based on cached drill-fit scoring.
- Block timer with large rink display.
- Quick coach notes saved locally.
- Practice completion recap saved locally with copy/export path.
- Parent/staff recap publish flow from the full app when back online.
- PWA shortcut now opens `bench.html` directly.
- Static test coverage for Bench Mode assets and standalone page.

## Notes

Bench Mode is intentionally web/PWA-based for this release. A future native iPad/phone build could add Apple Pencil-first drawing and deeper device-specific offline storage, but this release gives coaches a usable rink workflow immediately.
