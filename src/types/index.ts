export type WorkMode = 'remote' | 'onsite' | 'hybrid'

export type RoleSource = 'empty' | 'Upnest' | 'Paraform'

export type CandidateStatus =
  | 'calendly_sent'
  | 'calendly_booked'
  | 'to_be_submitted'
  | 'needs_role'
  | 'standby'
  | 'submitted'
  | 'first_interview'
  | 'second_interview'
  | 'third_interview'
  | 'fourth_interview'
  | 'final_interview'
  | 'offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'cv_rejected'
  | 'client_rejected'
  | 'candidate_quit'

export interface Role {
  id: string
  job_title: string
  company: string
  source?: RoleSource
  location?: string
  salary_min?: number
  salary_max?: number
  work_mode: WorkMode
  work_mode_details?: string
  experience?: string
  /** The whole job post: brief, requirements, process, company — all of it. */
  description?: string
  bounty?: number
  /** Fee percentage agreed for this role, e.g. 17.5. */
  bounty_pct?: number
  /** URL of the role on Paraform / the sourcing platform. */
  paraform_link?: string
  /** URL of the full job description. */
  job_description_link?: string
  /** Set once archived: hidden from lists, but kept so candidates keep it. */
  archived_at?: string | null
  created_at: string
}

export interface Candidate {
  id: string
  full_name: string
  email: string
  linkedin_url?: string
  /** null while we are still looking for a role for this candidate. */
  role_id: string | null
  status: CandidateStatus
  notes?: string
  /** Salary the candidate signed at. Overrides the role baseline bounty. */
  hired_salary?: number
  /** Role search snooze: hidden from the search list until this date. */
  next_search_at?: string | null
  created_at: string
  role?: Role | null
}

export interface CandidateWithRole extends Candidate {
  role: Role | null
}

export interface StatusEvent {
  id: string
  candidate_id: string
  status: CandidateStatus
  occurred_at: string
  note?: string
  created_at: string
}

export interface FollowUp {
  id: string
  candidate_id: string
  occurred_at: string
  note?: string
  author?: string
  created_at: string
}

export interface Note {
  id: string
  body: string
  author?: string
  /** Set when ticked off. Archived notes stay for the record. */
  archived_at?: string | null
  created_at: string
}

export type RoleWithCount = Role & { candidateCount: number }
