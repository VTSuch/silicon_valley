-- ============================================================================
-- Silicon Valley — Migration 018: outreach "rejected" status
--
-- "Skipped" = not now, maybe later (it has its own tab so you can review it).
-- "Rejected" = decided not to contact this person.
--
-- Safe to run in one go.
-- ============================================================================

alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_status_check;

alter table public.outreach_prospects
  add constraint outreach_prospects_status_check check (
    status in ('pending', 'sent', 'accepted', 'replied', 'interested', 'declined', 'skipped', 'rejected')
  );
