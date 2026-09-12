-- ============================================================================
-- Silicon Valley — Migration 014: schedule the Calendly sync
--
-- Polls the app's sync endpoint every 15 minutes so bookings land (and the
-- Telegram notification goes out) without anyone having the app open.
--
-- The endpoint and its shared secret live in Supabase Vault rather than in the
-- job body, so neither ends up in plain sight in cron.job. Supabase does not
-- allow `alter database ... set` for custom parameters, which is the usual
-- trick elsewhere.
--
-- Run FIRST, once, with your own values:
--
--   select vault.create_secret(
--     'https://your-app/api/calls/sync', 'sync_url', 'Calendly sync endpoint');
--   select vault.create_secret(
--     'your CALLS_SYNC_SECRET', 'sync_secret', 'Shared secret for that endpoint');
--
-- To change either later, use vault.update_secret(id, new_value) — creating a
-- second secret with the same name fails.
--
-- Safe to run in one go, and safe to re-run: the job is replaced, not doubled.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

select cron.unschedule('sync-calendly-calls')
where exists (select 1 from cron.job where jobname = 'sync-calendly-calls');

select cron.schedule(
  'sync-calendly-calls',
  '*/15 * * * *',
  $$
  -- Does nothing until both secrets exist, so scheduling before setting them
  -- up is harmless.
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'sync_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'sync_secret');
  $$
);
