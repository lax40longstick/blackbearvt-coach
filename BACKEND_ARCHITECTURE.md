# Bear Den Coach HQ Backend Architecture

## Recommended stack

- Frontend: static app plus authenticated workspace
- Auth: Clerk, Supabase Auth, Firebase Auth, or Auth0
- Database: Postgres or Firestore with strict tenant boundaries
- Billing: Stripe
- Monitoring: Sentry plus lightweight product analytics

## Current implementation priority

For this project, prefer `supabase-js` for the application path first.

Direct Postgres access is secondary and should be treated as optional tooling for scripts or maintenance, not as a blocker for auth, onboarding, or customer-facing flows.

## Core entities

### organizations

- `id`
- `name`
- `slug`
- `plan`
- `subscription_status`
- `billing_customer_id`
- `created_at`

### teams

- `id`
- `organization_id`
- `name`
- `age_group`
- `season_label`
- `timezone`
- `created_at`

### users

- `id`
- `email`
- `first_name`
- `last_name`
- `auth_provider_id`
- `created_at`

### memberships

- `id`
- `organization_id`
- `team_id`
- `user_id`
- `role`
- `status`
- `invited_by_user_id`

### subscriptions

- `id`
- `organization_id`
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan`
- `status`
- `trial_ends_at`
- `current_period_end`

### practices

- `id`
- `team_id`
- `title`
- `date`
- `theme`
- `progression`
- `notes`
- `saved_by_user_id`

### practice_blocks

- `id`
- `practice_id`
- `drill_id`
- `minutes`
- `label`
- `phase`
- `objective`
- `coach_note`
- `position`

## Permission model

- `owner`: billing, organization settings, destructive actions
- `head_coach`: full team management
- `assistant_coach`: plan and roster collaboration
- `manager`: schedule and communication access
- `director`: multi-team oversight

## Required integrations

- Stripe webhook handler for subscription state changes
- Auth webhook or post-signup hook for organization bootstrap
- Daily backup job for team and practice data
- Error and audit event pipeline

## Migration priority

1. Replace local team-code based sync with authenticated organization IDs
2. Move cloud config ownership to server-side environment configuration
3. Add organization and membership records
4. Gate features by plan entitlement
5. Add audit log and support tooling
