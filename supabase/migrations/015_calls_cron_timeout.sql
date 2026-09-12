-- ============================================================================
-- Silicon Valley — Migration 015: give the scheduled sync time to finish
--
-- pg_net hangs up after 5 seconds by default. A sync talks to Calendly once
-- per booking, so it routinely runs longer than that, and the endpoint was
-- being cut off mid-request — leaving the work half done.
--
-- Nothing else changes: same schedule, same secrets, same job name.
--
-- Safe to run in one go, and safe to re-run.
-- ============================================================================

select cron.unschedule('sync-calendly-calls')
where exists (select 1 from cron.job where jobname = 'sync-calendly-calls');

select cron.schedule(
  'sync-calendly-calls',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'sync_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'sync_secret');
  $$
);
