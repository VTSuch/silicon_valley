'use client'

import { useMemo, useState } from 'react'
import { Archive, Plus, Search } from 'lucide-react'
import { useRoles } from '@/hooks/useData'
import { useJourneys } from '@/hooks/useData'
import { useUI } from '@/context/UIContext'
import { SourcePill } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/dates'

const WORK_MODE: Record<string, string> = {
  remote: 'Remote',
  onsite: 'Onsite',
  hybrid: 'Hybrid',
}

export default function Roles({ onAdd }: { onAdd: () => void }) {
  const { rolesWithCount, archivedWithCount } = useRoles()
  const journeys = useJourneys()
  const { openRole } = useUI()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const activeByRole = useMemo(() => {
    const map = new Map<string, number>()
    for (const j of journeys) {
      if (!j.active || !j.candidate.role_id) continue
      map.set(j.candidate.role_id, (map.get(j.candidate.role_id) ?? 0) + 1)
    }
    return map
  }, [journeys])

  const rows = useMemo(() => {
    const source = showArchived ? archivedWithCount : rolesWithCount
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (r) =>
        r.job_title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.location ?? '').toLowerCase().includes(q)
    )
  }, [rolesWithCount, archivedWithCount, showArchived, query])

  const salary = (min?: number, max?: number) => {
    if (!min && !max) return '—'
    const f = (n?: number) => (n ? `$${Math.round(n / 1000)}k` : '?')
    return `${f(min)} – ${f(max)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Roles</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} {showArchived ? 'archived' : 'open'} role{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          Add role
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company or location…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
          />
        </div>

        {archivedWithCount.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 text-sm">
            <button
              onClick={() => setShowArchived(false)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                !showArchived ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                showArchived ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Archived {archivedWithCount.length}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Mode</th>
                <th className="px-4 py-2.5">Salary</th>
                <th className="px-4 py-2.5 text-right">Bounty</th>
                <th className="px-4 py-2.5 text-center">Candidates</th>
                <th className="px-4 py-2.5">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((role) => (
                <tr
                  key={role.id}
                  onClick={() => openRole(role.id)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{role.job_title}</div>
                    <div className="text-xs text-zinc-400">{role.company}</div>
                  </td>
                  <td className="px-4 py-3">
                    <SourcePill source={role.source} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{role.location || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {WORK_MODE[role.work_mode] ?? role.work_mode}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-zinc-600">
                    {salary(role.salary_min, role.salary_max)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">
                    {role.bounty ? `$${role.bounty.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-900">{role.candidateCount}</span>
                      {(activeByRole.get(role.id) ?? 0) > 0 && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-emerald-700">
                          {activeByRole.get(role.id)} live
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {formatDate(role.created_at)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-400">
                    {showArchived ? 'No archived roles.' : 'No roles yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
