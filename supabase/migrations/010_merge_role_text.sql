-- ============================================================================
-- Silicon Valley — Migration 010: one description per role
--
-- Requirements, skills, interview process and about-the-company are folded
-- into description under headings, then emptied. The columns stay in place
-- (nothing reads them any more) so this is reversible from a backup if a
-- merge ever looks wrong.
--
-- Only touches rows that still have something in those columns, so running
-- it twice cannot duplicate the text.
--
-- Safe to run in one go.
-- ============================================================================

update public.roles
set
  description = nullif(
    trim(
      concat_ws(
        E'\n\n',
        nullif(trim(coalesce(description, '')), ''),
        case
          when nullif(trim(coalesce(requirements, '')), '') is not null
          then E'## Requirements\n' || trim(requirements)
        end,
        case
          when nullif(trim(coalesce(skills, '')), '') is not null
          then E'## Skills\n' || trim(skills)
        end,
        case
          when nullif(trim(coalesce(interview_process, '')), '') is not null
          then E'## Interview process\n' || trim(interview_process)
        end,
        case
          when nullif(trim(coalesce(about_company, '')), '') is not null
          then E'## About the company\n' || trim(about_company)
        end
      )
    ),
    ''
  ),
  requirements = null,
  skills = null,
  interview_process = null,
  about_company = null
where
  nullif(trim(coalesce(requirements, '')), '') is not null
  or nullif(trim(coalesce(skills, '')), '') is not null
  or nullif(trim(coalesce(interview_process, '')), '') is not null
  or nullif(trim(coalesce(about_company, '')), '') is not null;
