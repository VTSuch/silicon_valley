'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUI } from '@/context/UIContext'
import { useData } from '@/context/DataContext'
import TopNav from './TopNav'
import Dashboard from '../dashboard/Dashboard'
import Pipeline from '../pipeline/Pipeline'
import Candidates from '../candidates/Candidates'
import Roles from '../roles/Roles'
import Metrics from '../metrics/Metrics'
import CandidateDrawer from '../candidates/CandidateDrawer'
import RoleDrawer from '../roles/RoleDrawer'
import AddCandidateModal from '../candidates/AddCandidateModal'
import AddRoleModal from '../roles/AddRoleModal'

export default function AppShell() {
  const { user } = useAuth()
  const { tab, openAddCandidate, addCandidateOpen, closeAddCandidate } = useUI()
  const { loading, error } = useData()
  const [addRole, setAddRole] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav
        userEmail={user?.email ?? ''}
        onAddCandidate={() => openAddCandidate()}
        onAddRole={() => setAddRole(true)}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-24 text-center text-sm text-zinc-400">Loading…</div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'pipeline' && <Pipeline />}
            {tab === 'candidates' && <Candidates onAdd={() => openAddCandidate()} />}
            {tab === 'roles' && <Roles onAdd={() => setAddRole(true)} />}
            {tab === 'metrics' && <Metrics />}
          </>
        )}
      </main>

      <CandidateDrawer />
      <RoleDrawer />
      <AddCandidateModal open={addCandidateOpen} onClose={closeAddCandidate} />
      <AddRoleModal open={addRole} onClose={() => setAddRole(false)} />
    </div>
  )
}
