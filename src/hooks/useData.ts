'use client'

import { useMemo } from 'react'
import { useData } from '@/context/DataContext'
import { buildJourneys } from '@/lib/journey'
import { RoleWithCount } from '@/types'

export function useRoles() {
  const { roles, loading, createRole, updateRole, deleteRole, candidates } = useData()

  const rolesWithCount = useMemo<RoleWithCount[]>(
    () =>
      roles.map((role) => ({
        ...role,
        candidateCount: candidates.filter((c) => c.role_id === role.id).length,
      })),
    [roles, candidates]
  )

  return { roles, rolesWithCount, loading, createRole, updateRole, deleteRole }
}

export function useCandidates() {
  const {
    candidates,
    loading,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    setStatus,
  } = useData()

  return { candidates, loading, createCandidate, updateCandidate, deleteCandidate, setStatus }
}

/** Candidates enriched with their stage history: dates, staleness, funnel depth. */
export function useJourneys() {
  const { candidates, statusEvents, followUpRules, followUps } = useData()
  return useMemo(
    () => buildJourneys(candidates, statusEvents, followUpRules, followUps),
    [candidates, statusEvents, followUpRules, followUps]
  )
}
