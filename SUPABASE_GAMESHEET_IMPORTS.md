# GameSheet Import Production Tables

Run this in Supabase SQL Editor if you want GameSheet imports to be stored server-side and refreshed by scheduled functions.

```sql
create table if not exists public.gamesheet_import_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid null,
  created_by uuid null,
  source text not null default 'gamesheet',
  source_url text,
  imported_at timestamptz not null default now(),
  games_count integer not null default 0,
  player_stats_count integer not null default 0,
  team_stats jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.gamesheet_import_runs enable row level security;

create policy if not exists "gamesheet_import_runs_read_team_staff"
  on public.gamesheet_import_runs
  for select
  using (
    team_id is null
    or exists (
      select 1 from public.memberships m
      where m.team_id = gamesheet_import_runs.team_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Writes should happen through Netlify Functions with SUPABASE_SERVICE_ROLE_KEY.
-- Do not create broad browser insert/update policies unless you intentionally want client-side imports persisted directly.

create index if not exists idx_gamesheet_import_runs_team_imported
  on public.gamesheet_import_runs(team_id, imported_at desc);
```

## Netlify scheduled refresh env vars

Use either a JSON array:

```env
GAMESHEET_SYNC_URLS=[{"url":"https://gamesheetstats.com/seasons/10754/scores?filter%5Bdivision%5D=overall","teamName":"Black Bear","teamId":"YOUR_TEAM_UUID"}]
```

or a comma-separated list:

```env
GAMESHEET_SYNC_URLS=https://gamesheetstats.com/seasons/10754/scores?filter%5Bdivision%5D=overall
```

The scheduled/manual endpoint is:

```text
/.netlify/functions/gamesheet-refresh
```
