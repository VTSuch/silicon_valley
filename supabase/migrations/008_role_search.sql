-- ============================================================================
-- Silicon Valley — Migration 008: role links + candidates without a role
--
-- Adds the two reference links to a role, lets a candidate exist before a
-- role is found for them, and gives those candidates a "search again from"
-- date so a search can be snoozed.
--
-- IMPORTANT: run STEP 1 on its own. Postgres will not let a new enum value
-- be added and used inside the same transaction. Run it, wait for "Success",
-- then run STEP 2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 — the new stage (run this block ALONE, first)
-- ---------------------------------------------------------------------------
alter type public.candidate_status add value if not exists 'needs_role';


-- ---------------------------------------------------------------------------
-- STEP 2 — columns (run after STEP 1 succeeded)
-- ---------------------------------------------------------------------------

-- Reference links for a role.
alter table public.roles
  add column if not exists paraform_link text,
  add column if not exists job_description_link text;

-- A candidate can now be parked without a role while we look for one.
alter table public.candidates
  alter column role_id drop not null;

-- When this candidate should show up in the role-search list again. NULL
-- means "right away"; a future date snoozes them until then.
alter table public.candidates
  add column if not exists next_search_at timestamp with time zone;

create index if not exists idx_candidates_next_search_at
  on public.candidates using btree (next_search_at);

comment on column public.roles.paraform_link is 'URL of the role on Paraform / the sourcing platform.';
comment on column public.roles.job_description_link is 'URL of the full job description.';
comment on column public.candidates.next_search_at is
  'Role-search snooze: hidden from the dashboard search list until this date.';
