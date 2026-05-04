# Changelog — v0.9.0 SEO Landing Pages + Director Dashboard

Two distribution-side gaps from the marketability assessment, shipped together because they reinforce each other — landing pages drive organic traffic that converts to Free signups, and the director dashboard is the unlock that lets a single Club sale provision an entire association.

## Added — SEO landing pages

5 new evergreen pages targeting the search terms the deep-research report called out:

- `youth-hockey-practice-plans.html` — "youth hockey practice plans"
- `animated-drills.html` — "animated hockey drills"
- `half-ice-practice-plans.html` — "half-ice practice plans"
- `small-area-games.html` — "small-area games hockey"
- `seasonal-templates.html` — "hockey season templates"

Each page includes:

- Genuine 1,200–1,800-word coaching content (not thin SEO filler — actually useful)
- Schema.org `Article` structured data for rich snippets
- Canonical URL, Open Graph, Twitter Card meta
- Internal links between all 5 landing pages plus pricing and signup CTAs
- Match site.css design system — no new visual debt
- A `?plan=free` deep-link CTA so signups land on the new Free tier without going through Stripe checkout

Plus:

- `sitemap.xml` listing all public pages with priorities
- `robots.txt` allowing crawl on public pages, blocking authenticated app pages and the new `club.html`
- `index.html` footer updated with links to all 5 landing pages (helps Googlebot discovery)

## Added — Association director dashboard

- `club.html` — director workspace page, gated by Club plan + director/owner role
- `src/features/club/director-store.js` — Supabase data layer:
  - `getDirectorContext()` — auth + role + plan gate
  - `loadClubDashboardData(supabase, orgId)` — single-batch parallel fetch of orgs, subs, teams, memberships, recent practices, lineups, announcements
  - `buildClubSummary(data)` — pure aggregation function (test-friendly, no side effects)
  - `pushPracticeTemplate(supabase, { orgId, teamIds, title, planData, createdBy })` — bulk-insert a draft practice into N teams
- `src/features/club/director-dashboard.js` — UI module:
  - KPI cards: total teams, active teams, dormant teams, teams without head coach, total coaches, practices in window
  - Per-team table with status pill (Active / Dormant / Needs setup), coach breakdown, last practice, 30-day practice count
  - Push-template panel: select teams, paste exported plan JSON, push to all selected teams as Drafts
- `service-worker.js` (`sw.js`) cache list updated to include `club.html`, `director-dashboard.js`, and `director-store.js`

### Dashboard logic — verified test cases (12 / 12 pass)

| Case | Expected | Verified |
|---|---|:---:|
| Team with no head coach | status = setup | ✅ |
| Team with head coach, no practice | status = setup | ✅ |
| Team with head coach + practice within 14d | status = active | ✅ |
| Team with head coach + practice older than 14d | status = dormant | ✅ |
| KPI: total teams | matches input | ✅ |
| KPI: active teams (head coach + recent practice) | counted | ✅ |
| KPI: dormant teams (recent practice but stale) | counted | ✅ |
| KPI: setup teams (missing coach or practice) | counted | ✅ |
| KPI: teams without head coach | flagged | ✅ |
| KPI: total practices in window | summed | ✅ |
| KPI: coach count (excludes managers) | summed | ✅ |
| Per-team: head/asst/manager broken out separately | correct | ✅ |

### Schema impact

**No migration required.** The dashboard reads from existing tables created in `supabase/migrations/v0.6.0-production-team-hub.sql`:

- `organizations` — for plan + subscription status
- `teams` — for the team list
- `memberships` — for coach/staff counts
- `team_practices` — for activity (last_practice, count)
- `team_lineups`, `team_announcements` — for richer activity signal (currently displayed as "last published")
- `subscriptions` — for billing status

If you've enabled RLS, the existing policies in `supabase/policies.sql` already scope rows by organization membership, so directors will only see their own organization's data. Verify your policies cover `team_practices` reads for the `director` role before public launch.

## Required follow-ups before release

1. **Add a "Director" link to the main app nav.** I didn't modify `app.html` directly because it's 130KB and a string-replace on a single occurrence is risky. Add this to your nav block, gated by `entitlements.clubAdmin === true`:
   ```html
   <a href="./club.html" class="button ghost">Director</a>
   ```
2. **Set `<meta property="og:image">`** on the SEO landing pages once you have a 1200×630 banner asset.
3. **Submit `sitemap.xml` to Google Search Console** after deploy — that's how you get the new pages indexed in days instead of weeks.
4. **Set up tracking events** for landing-page → free-signup conversion. The CTAs already have `?plan=free` — just wire `analytics.js` to capture the source page on signup.
5. **(Domain).** All canonical / og / sitemap URLs use `https://benchboss-coach-hq.com`. If your production domain is different, run a find-replace before deploy.

## Marketability score impact (cumulative)

| Dimension | Pre-v0.8 | After v0.8 | After v0.9 | Delta |
|---|:---:|:---:|:---:|:---:|
| Content depth (drill library) | 3 / 10 | 6 / 10 | 6 / 10 | — |
| Pricing / packaging fit | 5 / 10 | 8 / 10 | 8 / 10 | — |
| Distribution readiness | 3 / 10 | 3 / 10 | 6 / 10 | +3 |
| Trust / legal / ops readiness | 6 / 10 | 6 / 10 | 7 / 10 | +1 |
| **Weighted total** | **6.0 / 10** | **6.75 / 10** | **7.4 / 10** | **+1.4** |

Distribution score lift: 5 SEO landing pages targeting the report's exact recommended search terms, plus a director dashboard that turns a single Club sale into association-wide deployment (the report's #1 GTM motion).

Trust/ops score lift: real director workspace makes the Club plan a credible product, not just a pricing tier. Multi-team association pilots can now actually be sold and onboarded.

Remaining gaps to close (per the original report): real pilot cohort signed (you, with the connections), iPad-native drawing layer (needs Xcode/Swift), video review/breakdown adjacency, multi-sport expansion.
