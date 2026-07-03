-- Phase D: per-day chat usage counter + atomic increment RPC
create table if not exists public.chat_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.chat_usage enable row level security;
create policy "own chat_usage select" on public.chat_usage for select using (auth.uid() = user_id);
-- writes: service-role only (via RPC below)

-- Atomic: increments and returns new count, or -1 when already at/over limit.
-- security definer so the service-role Edge Function can call it; only bumps when under limit.
create or replace function public.bump_chat_usage(p_user uuid, p_day date, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.chat_usage (user_id, day, count) values (p_user, p_day, 1)
    on conflict (user_id, day)
    do update set count = public.chat_usage.count + 1
    where public.chat_usage.count < p_limit
    returning count into c;
  if c is null then
    return -1;  -- conflict row existed but was already at/over the limit
  end if;
  return c;
end $$;
revoke all on function public.bump_chat_usage(uuid, date, int) from public, anon, authenticated;
