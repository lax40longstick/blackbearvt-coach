# BenchBoss Coach HQ Selling Roadmap

This repo now covers the seven major commercialization tracks in a concrete way.

## 1. Rebrand and sharpen positioning

- Public home page: [index.html](/var/www/html/TWeide/bear-den-coach-hq/index.html)
- Pricing page: [pricing.html](/var/www/html/TWeide/bear-den-coach-hq/pricing.html)
- Trial entry: [auth.html](/var/www/html/TWeide/bear-den-coach-hq/auth.html)

Positioning statement:

`BenchBoss Coach HQ is a coaching workspace for youth hockey teams that combines practice planning, roster operations, and bench execution in one product.`

## 2. Refactor into a sellable product shell

- Existing workspace preserved as [app.html](/var/www/html/TWeide/bear-den-coach-hq/app.html)
- Shared public design system: [site.css](/var/www/html/TWeide/bear-den-coach-hq/site.css)
- Shared public interactions: [site.js](/var/www/html/TWeide/bear-den-coach-hq/site.js)

This is not a full framework migration yet. It is a commercial shell around the existing PWA so the project can move toward sale readiness without destabilizing the working coach tool.

## 3. Add real auth and backend flow

- Auth surface: [auth.html](/var/www/html/TWeide/bear-den-coach-hq/auth.html)
- Onboarding surface: [onboarding.html](/var/www/html/TWeide/bear-den-coach-hq/onboarding.html)
- Account surface: [account.html](/var/www/html/TWeide/bear-den-coach-hq/account.html)

Backend implementation target:

- Auth provider with email/password and magic links
- Team, organization, and membership tables
- Seat-based permissions
- Trial and subscription entitlements

## 4. Add Stripe billing

Recommended first plans:

- Starter: 1 team, solo coach
- Team: shared staff account
- Club: multi-team association

Stripe requirements:

- Monthly + annual prices per plan
- Trial period handling
- Webhooks for subscription state changes
- Entitlement sync on upgrade/downgrade

## 5. Add onboarding and account management

Covered in:

- [onboarding.html](/var/www/html/TWeide/bear-den-coach-hq/onboarding.html)
- [account.html](/var/www/html/TWeide/bear-den-coach-hq/account.html)

## 6. Add analytics, error monitoring, and backup policies

Implement next:

- Sentry or equivalent for frontend/runtime errors
- Product analytics for signup, activation, and retention events
- Daily backups for customer data
- Audit logs for billing and permissions changes

## 7. Build landing page and legal pages

Covered in:

- [index.html](/var/www/html/TWeide/bear-den-coach-hq/index.html)
- [pricing.html](/var/www/html/TWeide/bear-den-coach-hq/pricing.html)
- [privacy.html](/var/www/html/TWeide/bear-den-coach-hq/privacy.html)
- [terms.html](/var/www/html/TWeide/bear-den-coach-hq/terms.html)

## Pilot and launch

This is the only major item that cannot be fully completed from code alone. The repo now includes materials to support it, but you still need:

- 3 to 5 coaches using the product on real practices
- Feedback interviews
- Pricing objection notes
- Support workflow during pilot
