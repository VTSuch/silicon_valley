-- ============================================================================
-- Silicon Valley — Migration 005: follow-up log
--
-- Records each time someone chased a candidate, so a stalled candidate can
-- stay on the follow-up list without the team chasing them twice in a day.
-- Safe to run in one go.
-- ============================================================================

create table if not exists public.candidate_follow_ups (
  id uuid not null default gen_random_uuid(),
  candidate_id uuid not null,
  occurred_at timestamp with time zone not null default now(),
  note text null,
  author text null,
  created_at timestamp with time zone not null default now(),
  constraint candidate_follow_ups_pkey primary key (id),
  constraint candidate_follow_ups_candidate_id_fkey
    foreign key (candidate_id) references public.candidates (id) on delete cascade
);

create index if not exists idx_cfu_candidate_id
  on public.candidate_follow_ups using btree (candidate_id);
create index if not exists idx_cfu_occurred_at
  on public.candidate_follow_ups using btree (occurred_at);

alter table public.candidate_follow_ups enable row level security;

drop policy if exists "Authenticated users can view follow ups" on public.candidate_follow_ups;
create policy "Authenticated users can view follow ups"
  on public.candidate_follow_ups for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert follow ups" on public.candidate_follow_ups;
create policy "Authenticated users can insert follow ups"
  on public.candidate_follow_ups for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update follow ups" on public.candidate_follow_ups;
create policy "Authenticated users can update follow ups"
  on public.candidate_follow_ups for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete follow ups" on public.candidate_follow_ups;
create policy "Authenticated users can delete follow ups"
  on public.candidate_follow_ups for delete using (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.candidate_follow_ups;
exception when duplicate_object then null;
end $$;
