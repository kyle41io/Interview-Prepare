-- Phase F1: normalized progress domain (topic_progress, flashcard_reviews,
-- quiz_scores, bookmarks, streak, user_settings).
--
-- These tables adopt the existing public.profiles(id) primary key from the
-- Supabase schema (supabase/migrations/0001_init.sql) as their FK target.
-- They do NOT create/alter/drop any existing table.
--
-- RLS own-row policies are enabled as defense-in-depth; the API itself
-- connects with a privileged (service-role) Postgres connection via
-- PrismaService, so these policies are a second line of defense, not the
-- primary access control.

-- 1. topic_progress
create table if not exists public.topic_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  status text not null default 'learned',
  learned_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.topic_progress enable row level security;

create policy "own tp" on public.topic_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. flashcard_reviews
create table if not exists public.flashcard_reviews (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_key text not null,
  due_at timestamptz,
  interval integer not null default 0,
  ease double precision not null default 2.5,
  reps integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_key)
);

alter table public.flashcard_reviews enable row level security;

create policy "own fr" on public.flashcard_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. quiz_scores
create table if not exists public.quiz_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  best_pct integer not null default 0,
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.quiz_scores enable row level security;

create policy "own qs" on public.quiz_scores
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. bookmarks
create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.bookmarks enable row level security;

create policy "own bm" on public.bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. streak
create table if not exists public.streak (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_day date,
  updated_at timestamptz not null default now()
);

alter table public.streak enable row level security;

create policy "own streak" on public.streak
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. user_settings
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lang text,
  theme text,
  track_role text,
  track_level text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "own settings" on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
