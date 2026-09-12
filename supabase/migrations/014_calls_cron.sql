-- ============================================================================
-- Silicon Valley — Migration 014: schedule the Calendly sync
--
-- Polls the app's sync endpoint every 15 minutes so bookings land (and the
-- Telegram notification goes out) without anyone having the app open.
--
-- Before running, set the two settings below for your project — they are read
-- at call time, so the URL and secret never sit inside the job definition:
--
--   alter database postgres set app.sync_url    = 'https://YOUR-APP/api/calls/sync';
--   alter database postgres set app.sync_secret = 'the value of CALLS_SYNC_SECRET';
--
-- Safe to run in one go, and safe to re-run: the job is replaced, not doubled.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sync-calendly-calls')
where exists (select 1 from cron.job where jobname = 'sync-calendly-calls');

select cron.schedule(
  'sync-calendly-calls',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.sync_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', current_setting('app.sync_secret', true)
    ),
    body := '{}'::jsonb
  )
  where current_setting('app.sync_url', true) is not null;
  $$
);
