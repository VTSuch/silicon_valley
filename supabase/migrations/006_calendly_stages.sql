-- ============================================================================
-- Silicon Valley — Migration 006: Calendly stages
--
-- "To be called" becomes "Calendly sent", and a "Calendly booked" stage is
-- added for once the candidate actually picks a slot.
--
-- Renaming the enum value updates every existing candidate and every row of
-- stage history in place — no data migration needed.
--
-- IMPORTANT: run STEP 1 on its own. Postgres will not let a new enum value be
-- added and used inside the same transaction. Run it, wait for "Success",
-- then run STEP 2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 — rename and extend the enum (run this block ALONE, first)
-- ---------------------------------------------------------------------------
alter type public.candidate_status rename value 'to_be_called' to 'calendly_sent';
alter type public.candidate_status add value if not exists 'calendly_booked';


-- ---------------------------------------------------------------------------
-- STEP 2 — move the follow-up rule across (run after STEP 1 succeeded)
-- ---------------------------------------------------------------------------
-- The saved follow-up rules are keyed by status name, so rename the key and
-- seed a default for the new stage.
update public.app_settings
set
  value = (value - 'to_be_called')
    || jsonb_build_object('calendly_sent', coalesce(value -> 'to_be_called', '3'::jsonb))
    || jsonb_build_object('calendly_booked', coalesce(value -> 'calendly_booked', '5'::jsonb)),
  updated_at = now()
where key = 'follow_up_rules';
