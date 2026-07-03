-- Phase E: Gmail connection + AI-classified notifications/reminders
create table if not exists public.gmail_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  refresh_token text not null,
  last_scan timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.gmail_accounts enable row level security;
-- NO client policies: service-role only (client checks status via Edge Function).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,               -- 'test'|'interview'|'offer'|'rejection'|'other'
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  source text,                      -- gmail message-id (idempotency ref)
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "own notif select" on public.notifications for select using (auth.uid() = user_id);
create policy "own notif update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert: service-role only

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,               -- 'test'|'interview'
  title text not null,
  company text,
  due_at timestamptz,
  deadline_at timestamptz,
  status text not null default 'upcoming',  -- 'upcoming'|'done'|'dismissed'
  source text,
  created_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
create policy "own rem select" on public.reminders for select using (auth.uid() = user_id);
create policy "own rem update" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert: service-role only

create table if not exists public.gmail_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  msg_id text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, msg_id)
);
alter table public.gmail_seen enable row level security;
-- service-role only

-- Realtime: let clients subscribe to their own notifications inserts (RLS still applies).
alter publication supabase_realtime add table public.notifications;
