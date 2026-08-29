-- ============================================================================
-- Silicon Valley — Migration 007: "To be submitted" stage
--
-- Sits between "Calendly booked" and "Submitted": you have spoken to the
-- candidate and they are ready to go to the client.
--
-- A single statement, but it still has to run on its own — Postgres will not
-- let a new enum value be added and used inside the same transaction.
-- ============================================================================

alter type public.candidate_status add value if not exists 'to_be_submitted';
