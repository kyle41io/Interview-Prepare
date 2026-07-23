-- Phase F+: let the authenticated owner create/delete their own reminders.
-- Until now reminders were written only by the gmail-scan edge function (the
-- service role bypasses RLS), and the UI only did select + done/dismiss (update).
-- The calendar's manual add/delete needs client-side INSERT/DELETE policies.
drop policy if exists "own rem insert" on public.reminders;
create policy "own rem insert" on public.reminders
  for insert with check (auth.uid() = user_id);

-- Delete is scoped to manual events so AI-synced reminders can't be hard-deleted
-- from the client (those are dismissed via status instead).
drop policy if exists "own rem delete" on public.reminders;
create policy "own rem delete" on public.reminders
  for delete using (auth.uid() = user_id and source = 'manual');
