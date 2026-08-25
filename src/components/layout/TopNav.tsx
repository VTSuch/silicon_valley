'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Briefcase,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TabId, useUI } from '@/context/UIContext'

const TABS: { id: TabId; name: string; icon: React.ElementType }[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', name: 'Pipeline', icon: KanbanSquare },
  { id: 'candidates', name: 'Candidates', icon: Users },
  { id: 'roles', name: 'Roles', icon: Briefcase },
  { id: 'metrics', name: 'Metrics', icon: BarChart3 },
]

interface TopNavProps {
  userEmail: string
  onAddCandidate: () => void
  onAddRole: () => void
}

export default function TopNav({ userEmail, onAddCandidate, onAddRole }: TopNavProps) {
  const { tab, setTab } = useUI()
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setAddOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
            SV
          </div>
          <span className="hidden text-sm font-semibold text-zinc-900 sm:block">Silicon Valley</span>
        </div>

        <nav className="-mb-px flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.name}
              </button>
            )
          })}
        </nav>

        <div ref={ref} className="relative flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              setAddOpen((v) => !v)
              setMenuOpen(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {addOpen && (
            <div className="sv-fade-in absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
              <button
                onClick={() => {
                  setAddOpen(false)
                  onAddCandidate()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Users className="h-4 w-4 text-zinc-400" />
                New candidate
              </button>
              <button
                onClick={() => {
                  setAddOpen(false)
                  onAddRole()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Briefcase className="h-4 w-4 text-zinc-400" />
                New role
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setMenuOpen((v) => !v)
              setAddOpen(false)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
            title={userEmail}
          >
            {userEmail.slice(0, 1).toUpperCase() || '?'}
          </button>

          {menuOpen && (
            <div className="sv-fade-in absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
              <div className="truncate px-3 py-2 text-xs text-zinc-500">{userEmail}</div>
              <div className="my-1 h-px bg-zinc-100" />
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <LogOut className="h-4 w-4 text-zinc-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
