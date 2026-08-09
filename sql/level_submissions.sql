-- ═══════════════════════════════════════════════════════
--  LEVEL SUBMISSIONS
--  Run this once in the Supabase SQL Editor.
--
--  Anyone can submit a level. Only the admin email below can
--  read, update or delete them. That is enforced by RLS, so it
--  holds even though the anon key is public and someone could
--  call the REST API directly.
--
--  Admin is arham.akhtar111@gmail.com. If you ever sign in to
--  Supabase with a different address, change it in all four
--  policies below or review.html will show an empty queue.
-- ═══════════════════════════════════════════════════════

create table if not exists public.level_submissions (
  id          uuid primary key default gen_random_uuid(),
  game        text not null check (game in ('wavegauntlet', 'spider')),
  name        text not null check (char_length(name) between 1 and 40),
  diff        text not null check (char_length(diff) <= 12),
  speed       int  not null check (speed between 1 and 20000),
  clear_at    int  not null check (clear_at between 1 and 200000),
  data        jsonb not null,
  author      text check (char_length(author) <= 40),
  note        text check (char_length(note) <= 300),
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists level_submissions_status_idx
  on public.level_submissions (status, created_at desc);

alter table public.level_submissions enable row level security;

drop policy if exists "submissions insert" on public.level_submissions;
drop policy if exists "submissions read"   on public.level_submissions;
drop policy if exists "submissions update" on public.level_submissions;
drop policy if exists "submissions delete" on public.level_submissions;

-- Anyone may submit, but not oversized payloads. A level is a few KB;
-- 60KB is generous and stops someone using the table as free storage.
create policy "submissions insert"
  on public.level_submissions
  for insert
  with check (
    pg_column_size(data) < 60000
    and status = 'pending'
  );

-- Only the admin can see the queue or act on it
create policy "submissions read"
  on public.level_submissions for select
  using ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com');

create policy "submissions update"
  on public.level_submissions for update
  using      ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com');

create policy "submissions delete"
  on public.level_submissions for delete
  using ((auth.jwt() ->> 'email') = 'arham.akhtar111@gmail.com');

-- ── If it ever gets spammed ────────────────────────────
-- Submissions are anonymous by design, so there is no per-user rate
-- limit. If someone floods it, tighten the insert policy to require a
-- signed-in account:
--
--   drop policy "submissions insert" on public.level_submissions;
--   create policy "submissions insert" on public.level_submissions
--     for insert to authenticated
--     with check (pg_column_size(data) < 60000 and status = 'pending');
--
-- and clear the junk with:
--   delete from public.level_submissions where status = 'pending';
