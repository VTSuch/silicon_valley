-- ============================================================================
-- Silicon Valley — Migration 013: Calendly calls
--
-- Screening calls booked through Calendly, synced into the app so the
-- dashboard can list what is coming and the board can show the date on a
-- card. One row per Calendly booking, keyed on its URI so a re-sync updates
-- in place and a reschedule never duplicates.
--
-- `candidate_id` is filled by the matcher; `match` records how sure it was:
--   email      — the invitee's address is the candidate's
--   name       — a confident name match
--   suggested  — a plausible name match, waiting for a human to confirm
--   manual     — linked by hand in the app
--   none       — nobody matched yet
--
-- Safe to run in one go.
-- ============================================================================

create table if not exists public.calls (
  id uuid not null default gen_random_uuid(),
  -- The Calendly scheduled_event URI. Stable across reschedules.
  external_id text not null,
  candidate_id uuid null,
  invitee_name text not null,
  invitee_email text null,
  -- Calendly's name for the booking type, e.g. "Initial Screening".
  event_name text null,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone null,
  join_url text null,
  cancel_url text null,
  reschedule_url text null,
  -- active | canceled, straight from Calendly.
  status text not null default 'active',
  match text not null default 'none',
  -- Whatever the invitee typed into the booking form, kept as context.
  notes text null,
  -- Calendly's own updated_at, so a sync can skip bookings that have not moved.
  remote_updated_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint calls_pkey primary key (id),
  constraint calls_external_id_key unique (external_id),
  constraint calls_candidate_id_fkey foreign key (candidate_id)
    references public.candidates (id) on delete set null
);

create index if not exists idx_calls_starts_at on public.calls using btree (starts_at);
create index if not exists idx_calls_candidate_id on public.calls using btree (candidate_id);
create index if not exists idx_calls_status on public.calls using btree (status);

alter table public.calls enable row level security;

drop policy if exists "Authenticated users can view calls" on public.calls;
create policy "Authenticated users can view calls"
  on public.calls for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert calls" on public.calls;
create policy "Authenticated users can insert calls"
  on public.calls for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update calls" on public.calls;
create policy "Authenticated users can update calls"
  on public.calls for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete calls" on public.calls;
create policy "Authenticated users can delete calls"
  on public.calls for delete using (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.calls;
exception when duplicate_object then null;
end $$;
