'use client'

import { useMemo } from 'react'
import { CandidateStatus } from '@/types'
import { useData } from '@/context/DataContext'

export function useRoles() {
  const { roles, rolesLoading, fetchRoles, createRole } = useData()
  return { roles, loading: rolesLoading, fetchRoles, createRole }
}

export function useCandidates() {
  const {
    candidates,
    candidatesLoading,
    fetchCandidates,
    createCandidate,
    updateCandidate,
    updateCandidateStatus,
  } = useData()

  return {
    candidates,
    loading: candidatesLoading,
    fetchCandidates,
    createCandidate,
    updateCandidate,
    updateCandidateStatus,
  }
}

export function useDashboard() {
  const { roles, candidates } = useData()

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

  const rolesWithCandidateCount = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        candidateCount: candidates.filter((c) => c.role_id === role.id).length,
      })),
    [roles, candidates]
  )

  return { stats, rolesWithCandidateCount, candidates, roles }
}
