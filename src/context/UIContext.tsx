'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type TabId = 'dashboard' | 'pipeline' | 'candidates' | 'roles' | 'metrics'

/** Seed values for the new-candidate modal, used by duplicate and assign-role. */
export interface AddCandidatePrefill {
  full_name?: string
  email?: string
  linkedin_url?: string
  notes?: string
  role_id?: string
  /** The role-search candidate this came from, if any. */
  sourceCandidateId?: string
}

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
  addCandidatePrefill: AddCandidatePrefill | null
  addCandidateOpen: boolean
  openAddCandidate: (prefill?: AddCandidatePrefill) => void
  closeAddCandidate: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null)
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)
  const [addCandidateOpen, setAddCandidateOpen] = useState(false)
  const [addCandidatePrefill, setAddCandidatePrefill] = useState<AddCandidatePrefill | null>(null)

  const openCandidate = useCallback((id: string) => setOpenCandidateId(id), [])
  const closeCandidate = useCallback(() => setOpenCandidateId(null), [])
  const openRole = useCallback((id: string) => setOpenRoleId(id), [])
  const closeRole = useCallback(() => setOpenRoleId(null), [])

  const openAddCandidate = useCallback((prefill?: AddCandidatePrefill) => {
    setAddCandidatePrefill(prefill ?? null)
    setAddCandidateOpen(true)
  }, [])
  const closeAddCandidate = useCallback(() => {
    setAddCandidateOpen(false)
    setAddCandidatePrefill(null)
  }, [])

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
      addCandidateOpen,
      addCandidatePrefill,
      openAddCandidate,
      closeAddCandidate,
    }),
    [
      tab,
      openCandidateId,
      openCandidate,
      closeCandidate,
      openRoleId,
      openRole,
      closeRole,
      addCandidateOpen,
      addCandidatePrefill,
      openAddCandidate,
      closeAddCandidate,
    ]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within a UIProvider')
  return ctx
}
