-- Phase E: schedule gmail-scan every 15 minutes via pg_cron + pg_net.
-- Replace <PROJECT_REF> and <CRON_SECRET> before running in the SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('gmail-scan-15m', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/gmail-scan',
    headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
$$);

-- To remove later: select cron.unschedule('gmail-scan-15m');
