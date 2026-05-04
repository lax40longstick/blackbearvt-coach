# BenchBoss Coach HQ v0.10.0 RLS / Permissions Checklist

Run this before public launch.

## Required SQL

Run migrations in order:

```text
supabase/schema.sql
supabase/policies.sql
supabase/migrations/v0.3.7-patch.3-marketplace-purchases.sql
supabase/migrations/v0.6.0-production-team-hub.sql
supabase/migrations/v0.10.0-marketability-lift.sql
```

## Verify RLS

In Supabase SQL Editor:

```sql
select * from public.rls_production_check;
```

Every returned row should have:

```text
rls_enabled = true
rls_forced = true
```

## Permission tests

Create three users:

```text
owner/head coach
manager
parent/viewer
```

Then verify:

### Parent/viewer
- Can open `parent.html`
- Can see published lineups only
- Can see published practices/recaps only
- Can see public roster card fields only
- Cannot edit roster
- Cannot see guardians
- Cannot see team source configuration
- Cannot see draft lineups or draft practices
- Cannot access billing/admin settings

### Manager
- Can manage roster/source links
- Can import GameSheet stats
- Can update team branding/logo
- Cannot change Stripe billing unless also owner/director

### Coach
- Can create/publish practices
- Can create/publish lineups
- Can preload/use Bench Mode
- Can invite parents/managers if role allows

## Important privacy change

Parents now use:

```text
team_player_public_cards
team_public_source_links
```

Those views exclude sensitive roster fields like DOB and hide manager-only source settings.
