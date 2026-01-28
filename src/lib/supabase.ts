import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  },
})

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          job_title: string
          company: string
          salary_min: number | null
          salary_max: number | null
          work_mode: 'remote' | 'onsite' | 'hybrid'
          description: string | null
          requirements: string | null
          bounty: number | null
          created_at: string
        }
        Insert: {
          id?: string
          job_title: string
          company: string
          salary_min?: number | null
          salary_max?: number | null
          work_mode: 'remote' | 'onsite' | 'hybrid'
          description?: string | null
          requirements?: string | null
          bounty?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          job_title?: string
          company?: string
          salary_min?: number | null
          salary_max?: number | null
          work_mode?: 'remote' | 'onsite' | 'hybrid'
          description?: string | null
          requirements?: string | null
          bounty?: number | null
          created_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          full_name: string
          email: string
          linkedin_url: string | null
          role_id: string
          status: 'cv_rejected' | 'sent_to_agency' | 'sent_to_client' | 'first_interview' | 'second_interview' | 'third_interview' | 'fourth_interview' | 'final_interview' | 'client_rejected' | 'offer_accepted' | 'candidate_quit' | 'standby'
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          linkedin_url?: string | null
          role_id: string
          status?: 'cv_rejected' | 'sent_to_agency' | 'sent_to_client' | 'first_interview' | 'second_interview' | 'third_interview' | 'fourth_interview' | 'final_interview' | 'client_rejected' | 'offer_accepted' | 'candidate_quit' | 'standby'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          linkedin_url?: string | null
          role_id?: string
          status?: 'cv_rejected' | 'sent_to_agency' | 'sent_to_client' | 'first_interview' | 'second_interview' | 'third_interview' | 'fourth_interview' | 'final_interview' | 'client_rejected' | 'offer_accepted' | 'candidate_quit' | 'standby'
          created_at?: string
        }
      }
    }
  }
}
