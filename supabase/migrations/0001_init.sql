-- Phase B: profiles + user_state + RLS + profile auto-provision trigger

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own state select" on public.user_state;
create policy "own state select" on public.user_state for select using (auth.uid() = user_id);
drop policy if exists "own state insert" on public.user_state;
create policy "own state insert" on public.user_state for insert with check (auth.uid() = user_id);
drop policy if exists "own state update" on public.user_state;
create policy "own state update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own state delete" on public.user_state;
create policy "own state delete" on public.user_state for delete using (auth.uid() = user_id);

-- Auto-create a profile row when a new auth user signs up (uses Google metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
