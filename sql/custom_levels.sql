-- ═══════════════════════════════════════════════════════
--  CUSTOM LEVELS — for the Wave Gauntlet / Spider editor
--  Run this once in the Supabase SQL Editor.
--
--  Anyone can READ published levels (so all players get them).
--  Only the admin email below can INSERT / UPDATE / DELETE.
--  This is enforced server-side, so hiding the editor button
--  in the UI is just convenience — this is the real lock.
-- ═══════════════════════════════════════════════════════

create table if not exists public.custom_levels (
  id          uuid primary key default gen_random_uuid(),
  game        text not null check (game in ('wavegauntlet', 'spider')),
  name        text not null,
  diff        text not null,
  speed       int  not null,
  clear_at    int  not null,
  data        jsonb not null,          -- keyframes[] (wave) or obstacles[] (spider)
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists custom_levels_game_idx on public.custom_levels (game);

alter table public.custom_levels enable row level security;

-- Drop old policies so this script can be re-run safely
drop policy if exists "custom_levels read"  on public.custom_levels;
drop policy if exists "custom_levels write" on public.custom_levels;

-- Everyone (even logged out) can read levels
create policy "custom_levels read"
  on public.custom_levels
  for select
  using (true);

-- Only the admin account can create / edit / delete
create policy "custom_levels write"
  on public.custom_levels
  for all
  using      ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com');

-- Keep updated_at fresh
create or replace function public.touch_custom_levels()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists custom_levels_touch on public.custom_levels;
create trigger custom_levels_touch
  before update on public.custom_levels
  for each row execute function public.touch_custom_levels();
