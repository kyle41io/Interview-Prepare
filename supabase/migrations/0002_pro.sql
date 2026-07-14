-- Phase C: entitlements + payments + pro content, all RLS
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null default 'pro',
  status text not null default 'active',
  expires_at timestamptz not null,
  source text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "own entitlement select" on public.entitlements;
create policy "own entitlement select" on public.entitlements for select using (auth.uid() = user_id);
-- no insert/update/delete policies: service-role only

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  plan text not null default 'pro-month',
  amount int not null,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.payment_requests enable row level security;
drop policy if exists "own payreq select" on public.payment_requests;
create policy "own payreq select" on public.payment_requests for select using (auth.uid() = user_id);
drop policy if exists "own payreq insert" on public.payment_requests;
create policy "own payreq insert" on public.payment_requests for insert
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "own payreq submit" on public.payment_requests;
create policy "own payreq submit" on public.payment_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'submitted');

create table if not exists public.pro_catalog (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  position int not null default 0,
  title jsonb not null,           -- {vi,en}
  unique(topic_id, position)
);
alter table public.pro_catalog enable row level security;
drop policy if exists "catalog select all" on public.pro_catalog;
create policy "catalog select all" on public.pro_catalog for select using (true);

create table if not exists public.pro_content (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  position int not null default 0,
  section jsonb not null,         -- full section {id,title:{vi,en},blocks:[...]}
  created_at timestamptz not null default now(),
  unique(topic_id, position)
);
alter table public.pro_content enable row level security;
drop policy if exists "pro content for entitled" on public.pro_content;
create policy "pro content for entitled" on public.pro_content for select using (
  exists (select 1 from public.entitlements e
          where e.user_id = auth.uid() and e.status = 'active' and e.expires_at > now())
);
