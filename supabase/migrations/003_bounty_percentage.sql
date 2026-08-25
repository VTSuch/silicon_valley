-- ============================================================================
-- Silicon Valley — Migration 003: percentage-based bounties
--
-- A role's bounty is a percentage of the salary. The role stores the
-- percentage and a baseline bounty computed from the bottom of its salary
-- band; once a candidate is hired at a negotiated salary, their own bounty is
-- recomputed from that salary instead.
--
-- Safe to run in one go.
-- ============================================================================

alter table public.roles
  add column if not exists bounty_pct numeric(5, 2);

alter table public.candidates
  add column if not exists hired_salary integer;

comment on column public.roles.bounty_pct is
  'Fee percentage agreed for the role, e.g. 17.50. Multiplied by salary_min for the baseline bounty.';
comment on column public.candidates.hired_salary is
  'Salary the candidate actually signed at. Overrides the role baseline when computing their bounty.';
