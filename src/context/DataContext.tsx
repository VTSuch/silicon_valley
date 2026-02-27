'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Candidate, CandidateStatus, CandidateWithRole, Role } from '@/types'

type CreateRoleInput = Omit<Role, 'id' | 'created_at'>

type UpdateCandidateInput = Partial<
  Pick<Candidate, 'full_name' | 'email' | 'role_id' | 'status' | 'linkedin_url'>
>

interface DataContextValue {
  roles: Role[]
  rolesLoading: boolean
  fetchRoles: () => Promise<void>
  createRole: (role: CreateRoleInput) => Promise<Role>

  candidates: CandidateWithRole[]
  candidatesLoading: boolean
  fetchCandidates: () => Promise<void>
  createCandidate: (candidate: Omit<Candidate, 'id' | 'created_at'>) => Promise<CandidateWithRole>
  updateCandidate: (id: string, updates: UpdateCandidateInput) => Promise<CandidateWithRole>
  updateCandidateStatus: (id: string, status: CandidateStatus) => Promise<CandidateWithRole>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)

  const [candidates, setCandidates] = useState<CandidateWithRole[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true)
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching roles:', error)
    } else {
      setRoles((data as Role[]) || [])
    }
    setRolesLoading(false)
  }, [])

  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true)
    const { data, error } = await supabase
      .from('candidates')
      .select(
        `
        *,
        role:roles(*)
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching candidates:', error)
    } else {
      setCandidates((data as CandidateWithRole[]) || [])
    }
    setCandidatesLoading(false)
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchCandidates()
  }, [fetchCandidates, fetchRoles])

  useEffect(() => {
    const rolesChannel = supabase
      .channel('roles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        async () => {
          await fetchRoles()
        }
      )
      .subscribe()

    const candidatesChannel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidates' },
        async () => {
          await fetchCandidates()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(rolesChannel)
      supabase.removeChannel(candidatesChannel)
    }
  }, [fetchCandidates, fetchRoles])

  const createRole = useCallback(async (role: CreateRoleInput) => {
    const { data, error } = await supabase.from('roles').insert(role).select().single()

    if (error) {
      console.error('Error creating role:', error)
      throw error
    }

    setRoles((prev) => [data as Role, ...prev])
    return data as Role
  }, [])

  const createCandidate = useCallback(async (candidate: Omit<Candidate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidate)
      .select(
        `
        *,
        role:roles(*)
      `
      )
      .single()

    if (error) {
      console.error('Error creating candidate:', error)
      throw error
    }

    setCandidates((prev) => [data as CandidateWithRole, ...prev])
    return data as CandidateWithRole
  }, [])

  const updateCandidate = useCallback(async (id: string, updates: UpdateCandidateInput) => {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        role:roles(*)
      `
      )
      .single()

    if (error) {
      console.error('Error updating candidate:', error)
      throw error
    }

    setCandidates((prev) => prev.map((c) => (c.id === id ? (data as CandidateWithRole) : c)))
    return data as CandidateWithRole
  }, [])

  const updateCandidateStatus = useCallback(
    async (id: string, status: CandidateStatus) => {
      return updateCandidate(id, { status })
    },
    [updateCandidate]
  )

  const value = useMemo<DataContextValue>(
    () => ({
      roles,
      rolesLoading,
      fetchRoles,
      createRole,
      candidates,
      candidatesLoading,
      fetchCandidates,
      createCandidate,
      updateCandidate,
      updateCandidateStatus,
    }),
    [
      roles,
      rolesLoading,
      fetchRoles,
      createRole,
      candidates,
      candidatesLoading,
      fetchCandidates,
      createCandidate,
      updateCandidate,
      updateCandidateStatus,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider')
  }
  return ctx
}
