'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Candidate,
  CandidateStatus,
  CandidateWithRole,
  FollowUp,
  Role,
  StatusEvent,
} from '@/types'
import { FOLLOW_UP_KEY, FollowUpRules, parseRules } from '@/lib/settings'

type CreateRoleInput = Omit<Role, 'id' | 'created_at'>
type UpdateRoleInput = Partial<CreateRoleInput>

type CandidateFields = Pick<
  Candidate,
  'full_name' | 'email' | 'role_id' | 'status' | 'linkedin_url' | 'notes' | 'hired_salary'
>
type UpdateCandidateInput = Partial<CandidateFields>

interface DataContextValue {
  roles: Role[]
  candidates: CandidateWithRole[]
  statusEvents: StatusEvent[]
  followUps: FollowUp[]
  followUpRules: FollowUpRules
  saveFollowUpRules: (rules: FollowUpRules) => Promise<void>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>

  createRole: (role: CreateRoleInput) => Promise<Role>
  updateRole: (id: string, updates: UpdateRoleInput) => Promise<Role>
  deleteRole: (id: string) => Promise<void>

  createCandidate: (
    candidate: Omit<Candidate, 'id' | 'created_at'>,
    occurredAt?: Date
  ) => Promise<CandidateWithRole>
  updateCandidate: (id: string, updates: UpdateCandidateInput) => Promise<CandidateWithRole>
  deleteCandidate: (id: string) => Promise<void>
  /** Moves a candidate to a new stage and records the date it happened. */
  setStatus: (
    id: string,
    status: CandidateStatus,
    occurredAt?: Date,
    note?: string
  ) => Promise<void>

  addStatusEvent: (
    candidateId: string,
    status: CandidateStatus,
    occurredAt: Date,
    note?: string
  ) => Promise<void>
  updateStatusEvent: (id: string, updates: { occurred_at?: string; note?: string }) => Promise<void>
  deleteStatusEvent: (id: string) => Promise<void>

  /** Records that someone chased this candidate, so nobody chases twice. */
  logFollowUp: (candidateId: string, occurredAt: Date, note?: string) => Promise<void>
  deleteFollowUp: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const CANDIDATE_SELECT = `*, role:roles(*)`

/**
 * How to sign a follow-up. Supabase shows "Display name" in its auth table,
 * which is whatever the sign-up flow put in user metadata; fall back through
 * the usual keys and only use the email as a last resort.
 */
function displayName(user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  const meta = user?.user_metadata ?? {}
  for (const key of ['display_name', 'displayName', 'full_name', 'name']) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const first = typeof meta.first_name === 'string' ? meta.first_name.trim() : ''
  const last = typeof meta.last_name === 'string' ? meta.last_name.trim() : ''
  const composed = `${first} ${last}`.trim()
  if (composed) return composed
  return user?.email ?? null
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [candidates, setCandidates] = useState<CandidateWithRole[]>([])
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [followUpRules, setFollowUpRules] = useState<FollowUpRules>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [rolesRes, candidatesRes, eventsRes, followUpsRes, settingsRes] = await Promise.all([
      supabase.from('roles').select('*').order('created_at', { ascending: false }),
      supabase.from('candidates').select(CANDIDATE_SELECT).order('created_at', { ascending: false }),
      supabase
        .from('candidate_status_events')
        .select('*')
        .order('occurred_at', { ascending: true }),
      supabase
        .from('candidate_follow_ups')
        .select('*')
        .order('occurred_at', { ascending: true }),
      supabase.from('app_settings').select('value').eq('key', FOLLOW_UP_KEY).maybeSingle(),
    ])

    if (rolesRes.error) setError(rolesRes.error.message)
    else setRoles((rolesRes.data as Role[]) ?? [])

    if (candidatesRes.error) setError(candidatesRes.error.message)
    else setCandidates((candidatesRes.data as CandidateWithRole[]) ?? [])

    if (eventsRes.error) {
      // The history table may not exist yet — the app still works without it.
      console.warn('Status history unavailable:', eventsRes.error.message)
      setStatusEvents([])
    } else {
      setStatusEvents((eventsRes.data as StatusEvent[]) ?? [])
    }

    if (followUpsRes.error) {
      // The follow-up table may not exist yet — the rest still works.
      console.warn('Follow-up log unavailable:', followUpsRes.error.message)
      setFollowUps([])
    } else {
      setFollowUps((followUpsRes.data as FollowUp[]) ?? [])
    }

    if (settingsRes.error) {
      // The settings table may not exist yet — defaults still apply.
      console.warn('Settings unavailable:', settingsRes.error.message)
    } else {
      setFollowUpRules(parseRules(settingsRes.data?.value))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await refresh()
      if (cancelled) return
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel('silicon-valley-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_status_events' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_follow_ups' },
        () => refresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () =>
        refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const logFollowUp = useCallback(
    async (candidateId: string, occurredAt: Date, note?: string) => {
      const { data: auth } = await supabase.auth.getUser()
      const author = displayName(auth.user)
      const { data, error } = await supabase
        .from('candidate_follow_ups')
        .insert({
          candidate_id: candidateId,
          occurred_at: occurredAt.toISOString(),
          note: note || null,
          author,
        })
        .select()
        .single()
      if (error) throw error
      setFollowUps((prev) => [...prev, data as FollowUp])
    },
    []
  )

  const deleteFollowUp = useCallback(async (id: string) => {
    const { error } = await supabase.from('candidate_follow_ups').delete().eq('id', id)
    if (error) throw error
    setFollowUps((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const saveFollowUpRules = useCallback(async (rules: FollowUpRules) => {
    setFollowUpRules(rules)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: FOLLOW_UP_KEY, value: rules, updated_at: new Date().toISOString() })
    if (error) throw error
  }, [])

  // --- roles ----------------------------------------------------------------

  const createRole = useCallback(async (role: CreateRoleInput) => {
    const { data, error } = await supabase.from('roles').insert(role).select().single()
    if (error) throw error
    setRoles((prev) => [data as Role, ...prev])
    return data as Role
  }, [])

  const updateRole = useCallback(async (id: string, updates: UpdateRoleInput) => {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const role = data as Role
    setRoles((prev) => prev.map((r) => (r.id === id ? role : r)))
    setCandidates((prev) => prev.map((c) => (c.role_id === id ? { ...c, role } : c)))
    return role
  }, [])

  const deleteRole = useCallback(async (id: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) throw error
    setRoles((prev) => prev.filter((r) => r.id !== id))
    setCandidates((prev) => prev.filter((c) => c.role_id !== id))
  }, [])

  // --- status history -------------------------------------------------------

  const addStatusEvent = useCallback(
    async (candidateId: string, status: CandidateStatus, occurredAt: Date, note?: string) => {
      const { data, error } = await supabase
        .from('candidate_status_events')
        .insert({
          candidate_id: candidateId,
          status,
          occurred_at: occurredAt.toISOString(),
          note: note || null,
        })
        .select()
        .single()
      if (error) throw error
      setStatusEvents((prev) => [...prev, data as StatusEvent])
    },
    []
  )

  const updateStatusEvent = useCallback(
    async (id: string, updates: { occurred_at?: string; note?: string }) => {
      const { data, error } = await supabase
        .from('candidate_status_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setStatusEvents((prev) => prev.map((e) => (e.id === id ? (data as StatusEvent) : e)))
    },
    []
  )

  const deleteStatusEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from('candidate_status_events').delete().eq('id', id)
    if (error) throw error
    setStatusEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // --- candidates -----------------------------------------------------------

  const createCandidate = useCallback(
    async (candidate: Omit<Candidate, 'id' | 'created_at'>, occurredAt?: Date) => {
      const { data, error } = await supabase
        .from('candidates')
        .insert(candidate)
        .select(CANDIDATE_SELECT)
        .single()
      if (error) throw error

      const created = data as CandidateWithRole
      setCandidates((prev) => [created, ...prev])
      try {
        await addStatusEvent(created.id, created.status, occurredAt ?? new Date(created.created_at))
      } catch (e) {
        console.warn('Could not record initial status event', e)
      }
      return created
    },
    [addStatusEvent]
  )

  const updateCandidate = useCallback(async (id: string, updates: UpdateCandidateInput) => {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select(CANDIDATE_SELECT)
      .single()
    if (error) throw error
    const updated = data as CandidateWithRole
    setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  const deleteCandidate = useCallback(async (id: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id)
    if (error) throw error
    setCandidates((prev) => prev.filter((c) => c.id !== id))
    setStatusEvents((prev) => prev.filter((e) => e.candidate_id !== id))
    setFollowUps((prev) => prev.filter((f) => f.candidate_id !== id))
  }, [])

  const setStatus = useCallback(
    async (id: string, status: CandidateStatus, occurredAt?: Date, note?: string) => {
      await updateCandidate(id, { status })
      try {
        await addStatusEvent(id, status, occurredAt ?? new Date(), note)
      } catch (e) {
        console.warn('Could not record status event', e)
      }
    },
    [addStatusEvent, updateCandidate]
  )

  const value = useMemo<DataContextValue>(
    () => ({
      roles,
      candidates,
      statusEvents,
      followUps,
      followUpRules,
      saveFollowUpRules,
      loading,
      error,
      refresh,
      createRole,
      updateRole,
      deleteRole,
      createCandidate,
      updateCandidate,
      deleteCandidate,
      setStatus,
      addStatusEvent,
      updateStatusEvent,
      deleteStatusEvent,
      logFollowUp,
      deleteFollowUp,
    }),
    [
      roles,
      candidates,
      statusEvents,
      followUps,
      followUpRules,
      saveFollowUpRules,
      loading,
      error,
      refresh,
      createRole,
      updateRole,
      deleteRole,
      createCandidate,
      updateCandidate,
      deleteCandidate,
      setStatus,
      addStatusEvent,
      updateStatusEvent,
      deleteStatusEvent,
      logFollowUp,
      deleteFollowUp,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
