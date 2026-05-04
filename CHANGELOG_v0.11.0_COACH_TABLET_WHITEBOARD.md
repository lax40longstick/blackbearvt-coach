# Changelog — v0.11.0 Coach Tablet PWA + Whiteboard

## Added

- New `coach.html` tablet/mobile coach launcher.
- New `whiteboard.html` standalone coach board.
- New `src/features/whiteboard/coach-whiteboard.js`.
- Whiteboard page inside `app.html`.
- Bottom-nav Whiteboard tab.
- Dashboard Whiteboard shortcut.
- Practice-plan Board and Freeze + Annotate actions.
- Animated Drill Viewer Freeze + Annotate button.
- Bench Mode Whiteboard and Freeze + Annotate actions.
- Standalone Bench Mode links to `whiteboard.html` with current drill/step.
- Full-rink and half-rink canvas backgrounds.
- Freehand drawing with pointer/stylus support.
- Arrow drawing.
- Player/opponent/goalie/puck/cone/text placement.
- Move, erase/delete, undo, redo, clear, duplicate.
- Local sketch persistence.
- Attach sketch to current practice.
- PNG export.
- PDF export via dynamic jsPDF import with print/image fallback.
- Service-worker cache updates for coach/whiteboard pages.
- PWA manifest shortcuts for Coach Workspace, Bench Mode, Coach Whiteboard, and Parent Portal.
- Static whiteboard test coverage.

## Product direction

This release makes the app tablet/PWA-first for coaches while keeping the parent/team experience lightweight and view-only.

## Validation

Passed:

```text
npm run build
npm run test:smoke
npm run test:bench
npm run test:whiteboard
npm run test:marketability
npm run test:state
npm run test:load
```

Full behavior tests require installed dependencies such as `@supabase/supabase-js` and `stripe`.
