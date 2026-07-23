-- Let the authenticated owner clear their own notifications from the bell so
-- the queue doesn't grow unbounded. The UI only deletes rows that are already
-- read (see IP.gmail.deleteReadNotifications); the policy itself allows the
-- owner to delete any of their own rows, matching the notif select/update pair.
drop policy if exists "own notif delete" on public.notifications;
create policy "own notif delete" on public.notifications
  for delete using (auth.uid() = user_id);
