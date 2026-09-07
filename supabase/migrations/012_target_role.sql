-- ============================================================================
-- Silicon Valley — Migration 012: the brief for a candidate without a role
--
-- A candidate parked as "Needs a role" is someone we are actively hunting an
-- opening for. This records what we are hunting for, so the role-search list
-- says what to look for instead of just who is waiting.
-- ============================================================================

alter table public.candidates
  add column if not exists target_role text;

comment on column public.candidates.target_role is
  'What role we are looking for on this candidate''s behalf, while they have none.';
