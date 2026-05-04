# BenchBoss Coach HQ v0.11.0 — Coach Tablet PWA + Whiteboard

## Product focus

BenchBoss is now oriented around two surfaces:

### 1. Coach mobile/tablet app

Focused on the weekly coach workflow:

- practice planning
- Bench Mode
- animated drills
- lineup builder
- stats glance
- whiteboard / draw board

The app remains a web/PWA build so it can be installed on iPad, iPhone, Android tablets, and Android phones without a native app-store release.

### 2. Lighter parent/team mobile view

Focused on view-only team needs:

- lineup
- stats
- published drills
- schedule / SportsEngine links
- team updates / recaps

## New routes

```text
coach.html
whiteboard.html
```

`coach.html` is a tablet/mobile launcher that puts the coach workflow first: Practice, Bench Mode, Animated Drills, Lineup, Stats, Whiteboard, and Parent Portal.

`whiteboard.html` is a standalone tablet board that works independently from the large app shell and can be used at the rink.

## Whiteboard features

The whiteboard supports:

- full-rink view
- half-rink view
- freehand drawing
- arrows
- player markers
- opponent markers
- goalie marker
- pucks
- cones
- text labels
- move tool
- erase/delete tool
- undo
- redo
- clear ink
- save sketch
- duplicate sketch
- attach sketch to current practice
- export to PNG image
- export to PDF
- draw over an existing drill
- freeze-frame drill animation annotation
- stylus / Apple Pencil friendly pointer input

## Freeze-frame annotation workflow

Coaches can annotate a drill from multiple places:

1. Open an animated drill.
2. Tap **Freeze + Annotate**.
3. The current drill diagram opens as the whiteboard background.
4. Draw routes/corrections with touch or stylus.
5. Save, attach to practice, export, or duplicate.

Bench Mode and the standalone offline Bench page also link into `whiteboard.html` for rink-side annotation.

## Offline behavior

The service worker now caches:

```text
coach.html
whiteboard.html
src/features/whiteboard/coach-whiteboard.js
```

Sketches are stored locally under:

```text
benchboss_whiteboard_sketches_v1
```

When the full app is loaded, sketches are also mirrored into app state under:

```text
state.whiteboard.sketches
```

## Technical notes

The whiteboard is implemented in:

```text
src/features/whiteboard/coach-whiteboard.js
```

It is intentionally a classic browser script, not an ES module, so it can run in:

- `app.html`
- `whiteboard.html`
- future tablet shells
- offline cached contexts

## QA checklist

Before shipping to coaches:

```text
[ ] Install PWA on iPad/tablet
[ ] Open coach.html from home screen
[ ] Open whiteboard.html while online
[ ] Draw with finger
[ ] Draw with Apple Pencil/stylus
[ ] Toggle full/half rink
[ ] Place F/D/X/G markers
[ ] Place pucks and cones
[ ] Draw arrows
[ ] Erase objects/strokes
[ ] Undo/redo
[ ] Save sketch
[ ] Duplicate sketch
[ ] Export PNG
[ ] Export PDF
[ ] Open animated drill and tap Freeze + Annotate
[ ] Open Bench Mode and tap Freeze + Annotate
[ ] Disconnect internet and reopen whiteboard.html
```
