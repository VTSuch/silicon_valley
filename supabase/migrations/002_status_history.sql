-- ============================================================================
-- Silicon Valley — Migration 002: status history + new statuses
--
-- IMPORTANT: run STEP 1 on its own (Postgres does not allow adding enum
-- values and using them inside the same transaction). Run it, wait for
-- "Success", then run STEP 2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 — new statuses (run this block ALONE, first)
-- ---------------------------------------------------------------------------
ALTER TYPE public.candidate_status ADD VALUE IF NOT EXISTS 'offer';
ALTER TYPE public.candidate_status ADD VALUE IF NOT EXISTS 'offer_rejected';


-- ---------------------------------------------------------------------------
-- STEP 2 — history table, backfill, policies (run after STEP 1 succeeded)
-- ---------------------------------------------------------------------------

-- Every stage change a candidate goes through, with the date it happened.
create table if not exists public.candidate_status_events (
  id uuid not null default gen_random_uuid(),
  candidate_id uuid not null,
  status public.candidate_status not null,
  occurred_at timestamp with time zone not null default now(),
  note text null,
  created_at timestamp with time zone not null default now(),
  constraint candidate_status_events_pkey primary key (id),
  constraint candidate_status_events_candidate_id_fkey
    foreign key (candidate_id) references public.candidates (id) on delete cascade
);

create index if not exists idx_cse_candidate_id
  on public.candidate_status_events using btree (candidate_id);
create index if not exists idx_cse_occurred_at
  on public.candidate_status_events using btree (occurred_at);
create index if not exists idx_cse_status
  on public.candidate_status_events using btree (status);

-- Backfill: one event per existing candidate, dated at its creation.
insert into public.candidate_status_events (candidate_id, status, occurred_at, note)
select c.id, c.status, c.created_at, 'Backfilled from initial status'
from public.candidates c
where not exists (
  select 1 from public.candidate_status_events e where e.candidate_id = c.id
);

-- RLS
alter table public.candidate_status_events enable row level security;

drop policy if exists "Authenticated users can view status events" on public.candidate_status_events;
create policy "Authenticated users can view status events"
  on public.candidate_status_events for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert status events" on public.candidate_status_events;
create policy "Authenticated users can insert status events"
  on public.candidate_status_events for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update status events" on public.candidate_status_events;
create policy "Authenticated users can update status events"
  on public.candidate_status_events for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete status events" on public.candidate_status_events;
create policy "Authenticated users can delete status events"
  on public.candidate_status_events for delete using (auth.role() = 'authenticated');

-- Realtime (ignore if the table is already in the publication)
do $$
begin
  alter publication supabase_realtime add table public.candidate_status_events;
exception when duplicate_object then null;
end $$;
