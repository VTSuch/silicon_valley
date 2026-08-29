export type WorkMode = 'remote' | 'onsite' | 'hybrid'

export type RoleSource = 'empty' | 'Upnest' | 'Paraform'

export type CandidateStatus =
  | 'calendly_sent'
  | 'calendly_booked'
  | 'to_be_submitted'
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
  description?: string
  requirements?: string
  interview_process?: string
  about_company?: string
  skills?: string
  bounty?: number
  /** Fee percentage agreed for this role, e.g. 17.5. */
  bounty_pct?: number
  created_at: string
}

export interface Candidate {
  id: string
  full_name: string
  email: string
  linkedin_url?: string
  role_id: string
  status: CandidateStatus
  notes?: string
  /** Salary the candidate signed at. Overrides the role baseline bounty. */
  hired_salary?: number
  created_at: string
  role?: Role
}

export interface CandidateWithRole extends Candidate {
  role: Role
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

export type RoleWithCount = Role & { candidateCount: number }
