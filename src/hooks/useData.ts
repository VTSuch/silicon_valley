'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Role, Candidate, CandidateWithRole } from '@/types'

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching roles:', error)
    } else {
      setRoles(data || [])
    }
    setLoading(false)
  }

  const createRole = async (role: Omit<Role, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('roles')
      .insert(role)
      .select()
      .single()

    if (error) {
      console.error('Error creating role:', error)
      throw error
    }

    setRoles(prev => [data, ...prev])
    return data
  }

  return { roles, loading, fetchRoles, createRole }
}

export function useCandidates() {
  const [candidates, setCandidates] = useState<CandidateWithRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        role:roles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching candidates:', error)
    } else {
      setCandidates(data || [])
    }
    setLoading(false)
  }

  const createCandidate = async (candidate: Omit<Candidate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidate)
      .select(`
        *,
        role:roles(*)
      `)
      .single()

    if (error) {
      console.error('Error creating candidate:', error)
      throw error
    }

    setCandidates(prev => [data, ...prev])
    return data
  }

  const updateCandidateStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        role:roles(*)
      `)
      .single()

    if (error) {
      console.error('Error updating candidate:', error)
      throw error
    }

    setCandidates(prev => 
      prev.map(c => c.id === id ? data : c)
    )
    return data
  }

  return { candidates, loading, fetchCandidates, createCandidate, updateCandidateStatus }
}

export function useDashboard() {
  const { roles } = useRoles()
  const { candidates } = useCandidates()

  const stats = {
    totalCandidates: candidates.length,
    totalRoles: roles.length,
    offersAccepted: candidates.filter(c => c.status === 'offer_accepted').length,
    inInterview: candidates.filter(c => 
      c.status.includes('interview')
    ).length,
    sentToClient: candidates.filter(c => c.status === 'sent_to_client').length,
    sentToAgency: candidates.filter(c => c.status === 'sent_to_agency').length,
  }

  const rolesWithCandidateCount = roles.map(role => ({
    ...role,
    candidateCount: candidates.filter(c => c.role_id === role.id).length
  }))

  return { stats, rolesWithCandidateCount, candidates, roles }
}
