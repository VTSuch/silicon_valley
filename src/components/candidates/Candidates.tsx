'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Plus, Search } from 'lucide-react'
import { useJourneys } from '@/hooks/useData'
import { useUI } from '@/context/UIContext'
import { StatusBadge, SourcePill } from '@/components/common/StatusBadge'
import DateRangePills, { RangeSelection, defaultSelection } from '@/components/common/DateRangePills'
import StatusFilter from '@/components/common/StatusFilter'
import { formatDate, inRange, relativeAgo, relativeDays } from '@/lib/dates'
import { CandidateStatus } from '@/types'

type SortKey = 'recent' | 'stale' | 'name' | 'bounty'

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Last update' },
  { id: 'stale', label: 'Longest in stage' },
  { id: 'bounty', label: 'Highest bounty' },
  { id: 'name', label: 'Name' },
]

export default function Candidates({ onAdd }: { onAdd: () => void }) {
  const journeys = useJourneys()
  const { openCandidate } = useUI()
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<CandidateStatus[]>([])
  const [range, setRange] = useState<RangeSelection>(defaultSelection)
  const [sort, setSort] = useState<SortKey>('recent')
  const [sortOpen, setSortOpen] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = journeys.filter((j) => {
      if (statuses.length && !statuses.includes(j.status)) return false
      if (range.range.from || range.range.to) {
        if (!inRange(j.candidate.created_at, range.range)) return false
      }
      if (!q) return true
      return (
        j.candidate.full_name.toLowerCase().includes(q) ||
        j.candidate.email.toLowerCase().includes(q) ||
        (j.candidate.role?.job_title ?? '').toLowerCase().includes(q) ||
        (j.candidate.role?.company ?? '').toLowerCase().includes(q)
      )
    })

    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.candidate.full_name.localeCompare(b.candidate.full_name)
        case 'bounty':
          return b.bounty - a.bounty
        case 'stale':
          return b.daysInStatus - a.daysInStatus
        default:
          return b.since.getTime() - a.since.getTime()
      }
    })
    return out
  }, [journeys, query, statuses, range, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Candidates</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} of {journeys.length} — click any row to update the stage.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          Add candidate
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, role or company…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
          />
        </div>

        <StatusFilter value={statuses} onChange={setStatuses} />

        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            onBlur={() => setTimeout(() => setSortOpen(false), 150)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {SORTS.find((s) => s.id === sort)?.label}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          {sortOpen && (
            <div className="sv-fade-in absolute right-0 z-40 mt-1 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSort(s.id)
                    setSortOpen(false)
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                    sort === s.id ? 'font-medium text-zinc-900' : 'text-zinc-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <DateRangePills value={range} onChange={setRange} />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-2.5">Candidate</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Stage</th>
                <th className="px-4 py-2.5">In stage</th>
                <th className="px-4 py-2.5 text-right">Bounty</th>
                <th className="px-4 py-2.5">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((j) => (
                <tr
                  key={j.candidate.id}
                  onClick={() => openCandidate(j.candidate.id)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{j.candidate.full_name}</div>
                    <div className="text-xs text-zinc-400">{j.candidate.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-800">{j.candidate.role?.job_title ?? '—'}</div>
                    <div className="text-xs text-zinc-400">{j.candidate.role?.company}</div>
                  </td>
                  <td className="px-4 py-3">
                    <SourcePill source={j.candidate.role?.source} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-3">
                    {j.active ? (
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          j.stale
                            ? j.daysSinceFollowUp !== null
                              ? 'font-medium text-emerald-600'
                              : 'font-medium text-amber-600'
                            : 'text-zinc-500'
                        }`}
                        title={
                          j.daysSinceFollowUp !== null
                            ? `Followed up ${relativeAgo(j.daysSinceFollowUp)}`
                            : undefined
                        }
                      >
                        {j.stale &&
                          (j.daysSinceFollowUp !== null ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          ))}
                        {relativeDays(j.daysInStatus)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">closed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                    {j.bounty ? `$${j.bounty.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {formatDate(j.candidate.created_at)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                    No candidates match these filters.
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
