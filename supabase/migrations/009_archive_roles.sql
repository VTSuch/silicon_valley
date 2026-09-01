-- ============================================================================
-- Silicon Valley — Migration 009: archive roles instead of deleting them
--
-- Deleting a role used to cascade and take its candidates with it. Now a role
-- that has candidates is archived: it disappears from the roles list and from
-- the pickers, but the row stays, so every candidate keeps the full role it
-- was submitted to — title, company, bounty, links and all.
--
-- Safe to run in one go.
-- ============================================================================

alter table public.roles
  add column if not exists archived_at timestamp with time zone;

create index if not exists idx_roles_archived_at
  on public.roles using btree (archived_at);

-- Safety net: if a role is ever hard-deleted (from the Supabase table editor,
-- say), detach its candidates instead of deleting them.
alter table public.candidates
  drop constraint if exists candidates_role_id_fkey;

alter table public.candidates
  add constraint candidates_role_id_fkey
  foreign key (role_id) references public.roles (id) on delete set null;

comment on column public.roles.archived_at is
  'When the role was archived. Archived roles stay in the table so candidates keep their history.';
