# Bear Den Coach HQ Implementation Plan

## Current completed foundation

- Public product shell
- Authentication page scaffolding
- Session bootstrap and protected page access
- Supabase schema and RLS scaffolding
- Organization and team bootstrap flow
- Local git baseline

## Current implementation phase

Move from "signed-in user" to "signed-in tenant-aware account".

## Active goals

1. Load memberships, organizations, and teams for the signed-in user
2. Hydrate the account page with real tenant context
3. Add billing and entitlement scaffolding without blocking on live Stripe keys
4. Add monitoring and analytics wrappers so later integrations do not require another refactor

## Near-term sequence

1. Tenant context loader
2. Account page data hydration
3. Pricing page checkout scaffolding
4. Entitlement model
5. Monitoring and analytics wrappers
6. Team-aware workspace integration

## External blockers still requiring user action

- Stripe publishable key and product IDs
- Final buyer confirmation
- Role scope confirmation
- Browser testing of signup, sign-in, and onboarding
