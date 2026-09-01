-- ============================================================================
-- Silicon Valley — Migration 011: quick notes
--
-- A scratchpad on the dashboard. Ticking a note archives it rather than
-- deleting it, so the history stays browsable.
--
-- Safe to run in one go.
-- ============================================================================

create table if not exists public.notes (
  id uuid not null default gen_random_uuid(),
  body text not null,
  author text null,
  archived_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint notes_pkey primary key (id)
);

create index if not exists idx_notes_created_at
  on public.notes using btree (created_at);
create index if not exists idx_notes_archived_at
  on public.notes using btree (archived_at);

alter table public.notes enable row level security;

drop policy if exists "Authenticated users can view notes" on public.notes;
create policy "Authenticated users can view notes"
  on public.notes for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert notes" on public.notes;
create policy "Authenticated users can insert notes"
  on public.notes for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update notes" on public.notes;
create policy "Authenticated users can update notes"
  on public.notes for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete notes" on public.notes;
create policy "Authenticated users can delete notes"
  on public.notes for delete using (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;
