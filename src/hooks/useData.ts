'use client'

import { useMemo } from 'react'
import { useData } from '@/context/DataContext'
import { buildJourneys } from '@/lib/journey'
import { RoleWithCount } from '@/types'

export function useRoles() {
  const {
    roles,
    activeRoles,
    loading,
    createRole,
    updateRole,
    archiveRole,
    restoreRole,
    deleteRole,
    candidates,
  } = useData()

  /** How many candidates point at each role, archived ones included. */
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of candidates) {
      if (!c.role_id) continue
      map.set(c.role_id, (map.get(c.role_id) ?? 0) + 1)
    }
    return map
  }, [candidates])

  const rolesWithCount = useMemo<RoleWithCount[]>(
    () => activeRoles.map((role) => ({ ...role, candidateCount: counts.get(role.id) ?? 0 })),
    [activeRoles, counts]
  )

  const archivedWithCount = useMemo<RoleWithCount[]>(
    () =>
      roles
        .filter((r) => r.archived_at)
        .map((role) => ({ ...role, candidateCount: counts.get(role.id) ?? 0 })),
    [roles, counts]
  )

  return {
    roles,
    activeRoles,
    rolesWithCount,
    archivedWithCount,
    loading,
    createRole,
    updateRole,
    archiveRole,
    restoreRole,
    deleteRole,
  }
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
