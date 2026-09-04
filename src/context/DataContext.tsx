'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase'
import {
  Candidate,
  CandidateStatus,
  CandidateWithRole,
  FollowUp,
  Note,
  Role,
  StatusEvent,
} from '@/types'
import { FOLLOW_UP_KEY, FollowUpRules, parseRules } from '@/lib/settings'
import {
  candidateSummary,
  diffCandidate,
  diffRole,
  notify,
  roleSummary,
  statusLabel,
} from '@/lib/notify'

type CreateRoleInput = Omit<Role, 'id' | 'created_at'>
type UpdateRoleInput = Partial<CreateRoleInput> & { archived_at?: string | null }

type CandidateFields = Pick<
  Candidate,
  | 'full_name'
  | 'email'
  | 'role_id'
  | 'status'
  | 'linkedin_url'
  | 'notes'
  | 'hired_salary'
  | 'next_search_at'
>
type UpdateCandidateInput = Partial<CandidateFields>

interface DataContextValue {
  candidates: CandidateWithRole[]
  statusEvents: StatusEvent[]
  followUps: FollowUp[]
  notes: Note[]
  followUpRules: FollowUpRules
  saveFollowUpRules: (rules: FollowUpRules) => Promise<void>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>

  roles: Role[]
  /** Roles still on offer: everything not archived. */
  activeRoles: Role[]
  createRole: (role: CreateRoleInput) => Promise<Role>
  updateRole: (id: string, updates: UpdateRoleInput) => Promise<Role>
  /**
   * Hides the role. A role with candidates is archived rather than deleted,
   * so those candidates keep the role they were submitted to.
   */
  archiveRole: (id: string) => Promise<void>
  restoreRole: (id: string) => Promise<void>
  deleteRole: (id: string) => Promise<void>

  createCandidate: (
    candidate: Omit<Candidate, 'id' | 'created_at'>,
    occurredAt?: Date
  ) => Promise<CandidateWithRole>
  updateCandidate: (id: string, updates: UpdateCandidateInput) => Promise<CandidateWithRole>
  deleteCandidate: (id: string) => Promise<void>
  /**
   * Moves a candidate to a new stage and records the date it happened.
   * A hire also carries the signed salary, so the bounty is right from the
   * moment the move lands — including in the notification it sends.
   */
  setStatus: (
    id: string,
    status: CandidateStatus,
    occurredAt?: Date,
    note?: string,
    hiredSalary?: number
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

  createNote: (body: string) => Promise<void>
  /** Ticking a note archives it; passing null brings it back. */
  setNoteArchived: (id: string, archived: boolean) => Promise<void>
  deleteNote: (id: string) => Promise<void>
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
  const [notes, setNotes] = useState<Note[]>([])
  const [followUpRules, setFollowUpRules] = useState<FollowUpRules>({})
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  /**
   * The latest rows, readable from the mutation callbacks. Telegram messages
   * describe what changed, which means knowing what the row looked like
   * before the write, without rebuilding every callback on each render.
   */
  const rolesRef = useRef<Role[]>([])
  const candidatesRef = useRef<CandidateWithRole[]>([])
  /** Which user's data is already in memory, so focus events don't refetch. */
  const loadedForUser = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  useEffect(() => {
    candidatesRef.current = candidates
  }, [candidates])

  const roleName = useCallback((id: unknown) => {
    if (typeof id !== 'string') return null
    const role = rolesRef.current.find((r) => r.id === id)
    return role ? `${role.job_title} @ ${role.company}` : null
  }, [])

  const refresh = useCallback(async () => {
    const [rolesRes, candidatesRes, eventsRes, followUpsRes, notesRes, settingsRes] =
      await Promise.all([
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
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
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

    if (notesRes.error) {
      // The notes table may not exist yet — the rest still works.
      console.warn('Notes unavailable:', notesRes.error.message)
      setNotes([])
    } else {
      setNotes((notesRes.data as Note[]) ?? [])
    }

    if (settingsRes.error) {
      // The settings table may not exist yet — defaults still apply.
      console.warn('Settings unavailable:', settingsRes.error.message)
    } else {
      setFollowUpRules(parseRules(settingsRes.data?.value))
    }

    setLoading(false)
  }, [])

  // Every table is behind RLS, so fetching before the session exists just
  // returns empty rows. Wait for auth, then load once per user.
  //
  // Supabase re-validates the session whenever the tab regains focus and
  // fires SIGNED_IN / TOKEN_REFRESHED again. Reloading on those wiped the
  // screen back to a spinner every time you came back to the tab, so only a
  // genuinely different user triggers a fetch — anything that actually
  // changed meanwhile arrives over the realtime channel.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        loadedForUser.current = null
        setRoles([])
        setCandidates([])
        setStatusEvents([])
        setFollowUps([])
        setNotes([])
        setFollowUpRules({})
        setSignedIn(false)
        setLoading(false)
        return
      }

      setSignedIn(true)
      if (loadedForUser.current === session.user.id) return

      loadedForUser.current = session.user.id
      setLoading(true)
      void refresh()
    })

    return () => data.subscription.unsubscribe()
  }, [refresh])

  useEffect(() => {
    if (!signedIn) return

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () =>
        refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh, signedIn])

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

      const candidate = candidatesRef.current.find((c) => c.id === candidateId)
      if (candidate) {
        notify({
          type: 'follow_up_logged',
          candidate: candidateSummary(candidate, candidate.role),
          note,
          author,
        })
      }
    },
    []
  )

  const deleteFollowUp = useCallback(async (id: string) => {
    const { error } = await supabase.from('candidate_follow_ups').delete().eq('id', id)
    if (error) throw error
    setFollowUps((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const createNote = useCallback(async (body: string) => {
    const { data: auth } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('notes')
      .insert({ body, author: displayName(auth.user) })
      .select()
      .single()
    if (error) throw error
    setNotes((prev) => [data as Note, ...prev])
    notify({ type: 'note_created', body, author: displayName(auth.user) })
  }, [])

  const setNoteArchived = useCallback(async (id: string, archived: boolean) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setNotes((prev) => prev.map((n) => (n.id === id ? (data as Note) : n)))
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    setNotes((prev) => prev.filter((n) => n.id !== id))
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
    notify({ type: 'role_created', role: roleSummary(data as Role) })
    return data as Role
  }, [])

  const updateRole = useCallback(async (id: string, updates: UpdateRoleInput) => {
    const before = rolesRef.current.find((r) => r.id === id)
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

    // Archiving and restoring are announced by their own callers.
    const changes = before ? diffRole(before, updates) : []
    if (changes.length) notify({ type: 'role_updated', role: roleSummary(role), changes })

    return role
  }, [])

  const archiveRole = useCallback(
    async (id: string) => {
      const role = await updateRole(id, { archived_at: new Date().toISOString() })
      notify({ type: 'role_archived', role: roleSummary(role) })
    },
    [updateRole]
  )

  const restoreRole = useCallback(
    async (id: string) => {
      const role = await updateRole(id, { archived_at: null })
      notify({ type: 'role_restored', role: roleSummary(role) })
    },
    [updateRole]
  )

  /** Only ever used on a role nobody was submitted to. */
  const deleteRole = useCallback(async (id: string) => {
    const before = rolesRef.current.find((r) => r.id === id)
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) throw error
    setRoles((prev) => prev.filter((r) => r.id !== id))
    if (before) notify({ type: 'role_deleted', role: roleSummary(before) })
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
      notify({ type: 'candidate_created', candidate: candidateSummary(created, created.role) })
      return created
    },
    [addStatusEvent]
  )

  const updateCandidate = useCallback(
    async (id: string, updates: UpdateCandidateInput) => {
      const before = candidatesRef.current.find((c) => c.id === id)
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id)
        .select(CANDIDATE_SELECT)
        .single()
      if (error) throw error
      const updated = data as CandidateWithRole
      setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)))

      // A write that carries a status is a stage move, and setStatus
      // announces those itself — with the stage they came from.
      const changes =
        before && updates.status === undefined ? diffCandidate(before, updates, roleName) : []
      if (changes.length) {
        notify({
          type: 'candidate_updated',
          candidate: candidateSummary(updated, updated.role),
          changes,
        })
      }

      return updated
    },
    [roleName]
  )

  const deleteCandidate = useCallback(async (id: string) => {
    const before = candidatesRef.current.find((c) => c.id === id)
    const { error } = await supabase.from('candidates').delete().eq('id', id)
    if (error) throw error
    setCandidates((prev) => prev.filter((c) => c.id !== id))
    setStatusEvents((prev) => prev.filter((e) => e.candidate_id !== id))
    setFollowUps((prev) => prev.filter((f) => f.candidate_id !== id))
    if (before) {
      notify({ type: 'candidate_deleted', candidate: candidateSummary(before, before.role) })
    }
  }, [])

  const setStatus = useCallback(
    async (
      id: string,
      status: CandidateStatus,
      occurredAt?: Date,
      note?: string,
      hiredSalary?: number
    ) => {
      const before = candidatesRef.current.find((c) => c.id === id)
      const updated = await updateCandidate(id, {
        status,
        ...(hiredSalary === undefined ? {} : { hired_salary: hiredSalary }),
      })
      try {
        await addStatusEvent(id, status, occurredAt ?? new Date(), note)
      } catch (e) {
        console.warn('Could not record status event', e)
      }
      if (before?.status !== status) {
        notify({
          type: 'candidate_status_changed',
          candidate: candidateSummary(updated, updated.role),
          from: statusLabel(before?.status),
          to: statusLabel(status) ?? status,
          toId: status,
          note,
        })
      }
    },
    [addStatusEvent, updateCandidate]
  )

  const activeRoles = useMemo(() => roles.filter((r) => !r.archived_at), [roles])

  const value = useMemo<DataContextValue>(
    () => ({
      roles,
      activeRoles,
      candidates,
      statusEvents,
      followUps,
      notes,
      followUpRules,
      saveFollowUpRules,
      loading,
      error,
      refresh,
      createRole,
      updateRole,
      archiveRole,
      restoreRole,
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
      createNote,
      setNoteArchived,
      deleteNote,
    }),
    [
      roles,
      candidates,
      statusEvents,
      followUps,
      notes,
      followUpRules,
      saveFollowUpRules,
      loading,
      error,
      refresh,
      activeRoles,
      createRole,
      updateRole,
      archiveRole,
      restoreRole,
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
      createNote,
      setNoteArchived,
      deleteNote,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
