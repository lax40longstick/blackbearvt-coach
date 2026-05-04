# BenchBoss Coach HQ — Entitlements (v0.8.0)

## Plan matrix

| Capability | Free | Pro Coach | Team | Club |
|---|:---:|:---:|:---:|:---:|
| Annual price | $0 | $89/yr | $179/yr | $99/team/yr |
| Internal plan key | `free` | `starter` | `team` | `club` |
| Teams | 1 | 1 | 1 | up to 10 (custom) |
| Staff seats | 1 | 1 | 3 | custom |
| Active saved practices | 3 | unlimited | unlimited | unlimited |
| Animated drill library (217+) | ✅ | ✅ | ✅ | ✅ |
| Bench Mode + offline rink workflow | ✅ | ✅ | ✅ | ✅ |
| AI Practice Builder | ❌ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ✅ | ✅ | ✅ |
| Public share links | ❌ | ✅ | ✅ | ✅ |
| Marketplace paid imports | ❌ | ✅ | ✅ | ✅ |
| GameSheet + SportsEngine | ❌ | ✅ | ✅ | ✅ |
| Parent portal recap publish | ❌ | ✅ | ✅ | ✅ |
| Shared workspace | ❌ | ❌ | ✅ | ✅ |
| Manager invites | ❌ | ❌ | optional | ✅ |
| Multi-team admin | ❌ | ❌ | ❌ | ✅ |
| Shared club templates | ❌ | ❌ | ❌ | ✅ |

> Internal note: the `starter` key is retained for backward compatibility with existing `STRIPE_PRICE_STARTER_*` env vars. Marketing label is "Pro Coach"; no code rename is required.

## Role permissions

### Owner
- Manage billing
- Manage organization settings
- Manage team creation and deletion
- Invite and remove staff

### Head coach
- Full team planning access
- Edit roster, drills, and practice plans
- Invite staff if allowed by plan

### Assistant coach
- View and edit plans, drills, and roster
- No billing access

### Manager
- View schedule and limited team operations
- No billing access
- No destructive planning permissions by default

### Director
- Multi-team oversight (Club only)
- Shared templates and standards
- Limited billing unless also owner

## Enforcement rules

- Unauthenticated users cannot access account or team data
- Team membership is required to load team-scoped records
- Billing state gates paid features
- Free-plan limits enforced server-side: `maxSavedPracticesActive=3`, `aiPracticeBuilder=false`, `pdfExport=false`, `publicShareLinks=false`, `parentPortalPublish=false`
- Trial expiration should restrict paid-only features without deleting customer data
- Free → Pro upgrade preserves all data (no migration step)
- Pro/Team/Club → Free downgrade preserves data but enforces 3-active-practice cap (excess practices become read-only until upgrade)

## Free-tier conversion triggers

These are the explicit upgrade prompts the UI should surface:

| Trigger | Surface | CTA |
|---|---|---|
| Free coach tries to save 4th practice | Modal on save | "Upgrade to Pro to save unlimited plans — $89/yr" |
| Free coach taps "Generate with AI" | AI builder gate | "AI Practice Builder is a Pro feature — Upgrade $89/yr" |
| Free coach taps "Export PDF" or "Share link" | Share modal | "PDF + share links unlock with Pro — Upgrade $89/yr" |
| Pro coach invites a second staff member | Invite modal | "You'll need Team to add staff — $179/yr for 3 coaches" |
| Coach with 2nd team account | Team switcher | "Multi-team is a Club feature — talk to your hockey director" |

## Open decisions

- Whether Free should include 1 free PDF export per month as a "taste" of Pro
- Whether to add a 14-day full-Pro trial inside the Free tier or sell it as a separate path
- Whether `team` plan label should hide the per-seat math (current: "$179/yr") or expose it ("$60/coach")
- Final club tier discount tiers (10/25/50+ team brackets)
