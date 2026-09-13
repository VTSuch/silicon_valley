-- ============================================================================
-- Silicon Valley — Migration 016: one stage, not two
--
-- A candidate's stage was kept in two places: `candidates.status`, which the
-- board and every list read, and the event log, which the drawer shows as
-- Stage history. Nothing held them together. Change the status without
-- logging an event and the history falls behind; delete the newest event and
-- the status stays where it was, stranding the candidate in a stage their own
-- history does not mention.
--
-- From here the rule is simply: a candidate's status is the status of their
-- most recent event. Two triggers keep it true from either direction.
--
-- Safe to run in one go, and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The status of a candidate's newest event, or null when they have none.
-- ---------------------------------------------------------------------------
create or replace function public.latest_status(target uuid)
returns public.candidate_status
language sql
stable
as $$
  select e.status
  from public.candidate_status_events e
  where e.candidate_id = target
  order by e.occurred_at desc, e.created_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Log → status. Adding, redating or deleting an event moves the candidate to
-- whatever their history now ends with. This is what makes deleting the newest
-- entry mean "undo that move" rather than leaving the two disagreeing.
-- ---------------------------------------------------------------------------
create or replace function public.sync_status_from_events()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.candidate_id, old.candidate_id);
  latest public.candidate_status := public.latest_status(target);
begin
  if latest is not null then
    update public.candidates
      set status = latest
      where id = target and status is distinct from latest;
  end if;
  return null;
end;
$$;

drop trigger if exists candidate_status_events_sync on public.candidate_status_events;
create trigger candidate_status_events_sync
  after insert or update or delete on public.candidate_status_events
  for each row execute function public.sync_status_from_events();

-- ---------------------------------------------------------------------------
-- Status → log. A safety net for any path that sets the status directly
-- without recording it. The app writes its own event first, with the date and
-- note the user chose, so this only fires when something skipped that step.
-- ---------------------------------------------------------------------------
create or replace function public.log_status_change()
returns trigger
language plpgsql
as $$
begin
  if public.latest_status(new.id) is distinct from new.status then
    insert into public.candidate_status_events (candidate_id, status, occurred_at)
    values (new.id, new.status, now());
  end if;
  return null;
end;
$$;

drop trigger if exists candidates_log_status on public.candidates;
create trigger candidates_log_status
  after update of status on public.candidates
  for each row when (old.status is distinct from new.status)
  execute function public.log_status_change();

-- ---------------------------------------------------------------------------
-- Repair what has already drifted.
--
-- The status wins here, not the log: it is what the board has been showing and
-- what everyone has been working from, so nobody moves stage. The missing
-- entry is dated just after the candidate's previous one rather than today —
-- a candidate who dropped out in March should not appear to have done it now.
-- ---------------------------------------------------------------------------
insert into public.candidate_status_events (candidate_id, status, occurred_at, note)
select
  c.id,
  c.status,
  coalesce(l.occurred_at, c.created_at) + interval '1 second',
  'Recorded to match the stage the candidate was already in'
from public.candidates c
left join lateral (
  select e.status, e.occurred_at
  from public.candidate_status_events e
  where e.candidate_id = c.id
  order by e.occurred_at desc, e.created_at desc
  limit 1
) l on true
where l.status is distinct from c.status;
