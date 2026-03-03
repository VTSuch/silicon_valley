export type WorkMode = 'remote' | 'onsite' | 'hybrid'

export type CandidateStatus = 
  | 'cv_rejected'
  | 'sent_to_agency'
  | 'sent_to_client'
  | 'submitted'
  | 'first_interview'
  | 'second_interview'
  | 'third_interview'
  | 'fourth_interview'
  | 'final_interview'
  | 'client_rejected'
  | 'offer_accepted'
  | 'candidate_quit'
  | 'standby'
  | 'to_be_called'

export interface Role {
  id: string
  job_title: string
  company: string
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
  created_at: string
}

export interface Candidate {
  id: string
  full_name: string
  email: string
  linkedin_url?: string
  role_id: string
  status: CandidateStatus
  created_at: string
  role?: Role
}

export interface CandidateWithRole extends Candidate {
  role: Role
}
