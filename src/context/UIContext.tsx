'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type TabId = 'dashboard' | 'pipeline' | 'candidates' | 'roles' | 'metrics'

interface UIContextValue {
  tab: TabId
  setTab: (tab: TabId) => void
  /** Candidate shown in the detail drawer, from anywhere in the app. */
  openCandidateId: string | null
  openCandidate: (id: string) => void
  closeCandidate: () => void
  openRoleId: string | null
  openRole: (id: string) => void
  closeRole: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null)
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)

  const openCandidate = useCallback((id: string) => setOpenCandidateId(id), [])
  const closeCandidate = useCallback(() => setOpenCandidateId(null), [])
  const openRole = useCallback((id: string) => setOpenRoleId(id), [])
  const closeRole = useCallback(() => setOpenRoleId(null), [])

  const value = useMemo(
    () => ({
      tab,
      setTab,
      openCandidateId,
      openCandidate,
      closeCandidate,
      openRoleId,
      openRole,
      closeRole,
    }),
    [tab, openCandidateId, openCandidate, closeCandidate, openRoleId, openRole, closeRole]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within a UIProvider')
  return ctx
}
