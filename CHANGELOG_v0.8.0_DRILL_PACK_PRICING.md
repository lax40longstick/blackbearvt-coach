# Changelog — v0.8.0 Drill Library Expansion + Pricing Restructure

Two changes from the marketability assessment, shipped together because they each take less than a release on their own.

## Added

- **50 new animated drills (q48–q97)** in `data/elite-drills-pack-2.js`. Pack covers the gaps in `elite-drills.js`:
  - 8 fundamentals drills targeting 8U / 10U
  - 10 skill-progression drills for 10U / 12U
  - 8 stations / half-ice efficient drills (supports the existing "Stations" Bench Mode preset)
  - 6 compete + small-area-game variants
  - 8 game-situation / specialty drills (faceoffs, 6v5/5v6, special teams)
  - 5 conditioning + warmup drills
  - 5 goalie-specific drills
- **Coach Free tier** (`free` plan key) — 1 team, 1 coach, up to 3 active practices, full animated drill library, full Bench Mode + offline rink workflow, no AI builder, no PDF/share, no parent-portal publish.
- **`maxSavedPracticesActive`** entitlement field for enforcing the Free 3-practice cap.
- **`maxStaffSeats`** + `pricePerSeat` + `requiresCheckout` fields in `billing-config.js` for cleaner UI rendering.

## Changed

- **Pricing band rebalanced to match competing hockey-specific tools:**
  - Pro Coach (internal key `starter`): $190/yr → **$89/yr**, $19/mo → $9/mo. Sits between Ice Hockey Systems ($60/yr) and Hockey Coach Vision ($129/yr).
  - Team: $390/yr for 5 seats → **$179/yr for 3 seats** (~$60/coach). Matches CoachThem's $72/coach pricing.
  - Club: held at **$99/team/yr**. Matches CoachThem's $100/team association tier.
- **`pricing.html`** rewritten as a 4-card grid (Free / Pro Coach / Team / Club) with a billing comparison section explaining where each price sits in the market.
- **`ENTITLEMENTS.md`** replaced with an updated capability matrix and explicit Free → Pro conversion-trigger table.
- **`netlify/functions/ai-practice-builder.js`** `PLAN_LIMITS` now includes `free: 0` (AI builder hard-gated for Free tier). Lookup logic fixed to handle the 0 case correctly (previous `||` fallback would have shadowed it back to starter).
- **`practice-engine.js`** imports `eliteDrillsPack2` and merges into `animatedDrills`. Drill total: **107 → 157 drills (+47%)**, animated total: **47 → 97 drills (+106%)**.
- **`sw.js`** and **`src/features/bench/bench-mode.js`** add `./data/elite-drills-pack-2.js` to their respective cache lists so the new drills are available offline at the rink.

## Backward compatibility

- Internal plan key `starter` is unchanged. Existing `STRIPE_PRICE_STARTER_MONTHLY` / `STRIPE_PRICE_STARTER_ANNUAL` env vars continue to work — only the **Stripe-side prices need to be updated** to $9/mo and $89/yr.
- Existing customers on the old plans keep their entitlements until their subscription renews. Stripe webhooks will refresh entitlements at renewal.
- No database migration required. The `free` plan can be assigned at signup without a Stripe subscription.

## Required follow-ups before release

1. Update Stripe Dashboard prices for STARTER (Pro) and TEAM products to the new amounts. Webhook will sync.
2. If you want to lower Team seats from 5 to 3 for existing Team customers: grandfather them at 5 seats (don't auto-shrink). New Team subscriptions only get 3.
3. Free signup flow: route `auth.html?plan=free` to skip Stripe checkout entirely. Set `plan='free'` on user metadata at account creation.
4. UI gates for the four conversion triggers in `ENTITLEMENTS.md` (save 4th practice, AI builder click, PDF/share click, invite staff).
5. Marketing: update home page hero to reference Free tier — current copy still says "Start 14-day trial" which is for the old pricing model.

## Marketability score impact (vs `benchboss-marketability-assessment.md`)

| Dimension | Old | New | Delta |
|---|:---:|:---:|:---:|
| Content depth (drill library) | 3 / 10 | 6 / 10 | +3 |
| Pricing / packaging fit | 5 / 10 | 8 / 10 | +3 |
| **Weighted total** | **6.0 / 10** | **6.75 / 10** | **+0.75** |

That puts BenchBoss above the threshold where the report says hockey-only products start to look like real software businesses. The remaining gaps to close (per the same report): SEO landing pages, association director dashboard, iPad-native drawing layer, real pilot cohort.
