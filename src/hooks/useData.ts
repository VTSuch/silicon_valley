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
    submitted: candidates.filter(c => ['submitted', 'sent_to_agency', 'sent_to_client'].includes(c.status as any)).length,
    toBeCalled: candidates.filter(c => c.status === 'to_be_called').length,
    pipelineBounty: candidates
      .filter(c => [
        'submitted',
        'sent_to_agency',
        'sent_to_client',
        'first_interview',
        'second_interview',
        'third_interview',
        'fourth_interview',
        'final_interview',
        'to_be_called',
      ].includes(c.status as any))
      .reduce((sum, c) => sum + (c.role?.bounty ?? 0), 0),
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
