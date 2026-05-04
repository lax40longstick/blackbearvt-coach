# BenchBoss Coach HQ v0.10.0 Analytics Events

These events are wired for PostHog through `src/lib/analytics.js`.

## New / verified events

| Event | Trigger | Important properties |
|---|---|---|
| `practice_generated` | AI/local practice builder creates a plan | `source`, `blocks`, `minutes` |
| `bench_mode_opened` | Coach opens Bench Mode from app or standalone offline page | `mode`, `source`, `planTitle`, `blocks` |
| `drill_swapped` | Coach swaps a drill live or applies a preset that changes drills | `source`, `fromDrillId`, `toDrillId`, `preset`, `swaps` |
| `practice_completed` | Coach saves/completes a Bench Mode recap | `source`, `planTitle`, `blocks`, `notes` |
| `parent_recap_viewed` | Parent portal loads with published recap/practice data | `teamId`, `recaps`, `practices`, `hasLineup` |

## Offline behavior

Standalone Bench Mode may run without internet. Those events are queued in:

```text
benchboss_analytics_offline_queue_v1
```

The full app flushes the queue when PostHog is available again.

## PostHog env vars

```env
PUBLIC_POSTHOG_KEY=phc_xxxxx
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Suggested pilot dashboard

Track:

- Coaches who opened Bench Mode
- Practices completed per coach
- Drill swaps per practice
- Parent recap views per published recap
- Conversion by plan tier
