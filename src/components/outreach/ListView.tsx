'use client'

import { useMemo, useState } from 'react'
import { Copy, ExternalLink, ListFilter, MapPin, Trash2, UserPlus } from 'lucide-react'
import { OutreachSearch, Prospect, ProspectStatus } from '@/types'
import { useOutreach } from '@/context/OutreachContext'
import { useUI } from '@/context/UIContext'
import {
  PROSPECT_LABEL,
  PROSPECT_STATUSES,
  PROSPECT_TONE,
  copyMessage,
  fillTemplate,
} from '@/lib/outreach'
import { formatShortDate } from '@/lib/dates'
import { inputClass } from '@/components/common/Field'
import MultiSelect from './MultiSelect'

const PAGE = 200

export default function ListView({
  rows,
  searches,
}: {
  rows: Prospect[]
  searches: OutreachSearch[]
}) {
  const { settings, setProspectStatus, deleteProspect } = useOutreach()
  const { openAddCandidate } = useUI()
  const [q, setQ] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [locs, setLocs] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)
  const [note, setNote] = useState<string | null>(null)

  // A prospect's location is the one you typed on the search they were imported into.
  const locOf = useMemo(() => {
    const m = new Map(searches.map((s) => [s.id, (s.location ?? '').trim()]))
    return (p: Prospect) => m.get(p.search_id) ?? ''
  }, [searches])

  const locations = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) {
      const l = locOf(r)
      if (l && !seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [rows, locOf])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (statuses.length === 0 || statuses.includes(r.status)) &&
        (locs.length === 0 || locs.some((l) => l.toLowerCase() === locOf(r).toLowerCase())) &&
        (!needle || `${r.name} ${r.company ?? ''} ${r.title ?? ''}`.toLowerCase().includes(needle))
    )
  }, [rows, q, statuses, locs, locOf])

  const flash = (m: string) => {
    setNote(m)
    setTimeout(() => setNote(null), 1800)
  }

  const counts = useMemo(() => {
    const c = {} as Record<string, number>
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, title…"
          className={`${inputClass} max-w-xs`}
        />
        <MultiSelect
          label="Status"
          icon={<ListFilter className="h-3.5 w-3.5" />}
          value={statuses}
          onChange={setStatuses}
          options={PROSPECT_STATUSES.map((st) => ({ value: st, label: PROSPECT_LABEL[st], count: counts[st] ?? 0 }))}
        />
        <MultiSelect
          label="Location"
          icon={<MapPin className="h-3.5 w-3.5" />}
          value={locs}
          onChange={setLocs}
          options={locations.map((l) => ({
            value: l,
            label: l,
            count: rows.filter((r) => locOf(r).toLowerCase() === l.toLowerCase()).length,
          }))}
        />
        <span className="text-xs text-zinc-400">{filtered.length} shown</span>
        {note && <span className="ml-auto text-xs text-emerald-600">{note}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Search</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sent</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.slice(0, limit).map((r) => {
              const s = searches.find((x) => x.id === r.search_id)
              return (
                <tr key={r.id} className="hover:bg-zinc-50/60">
                  <td className="px-3 py-2">
                    <a
                      href={r.linkedin_url}
                      target="li_tab"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:underline"
                    >
                      {r.name}
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{r.title}</td>
                  <td className="px-3 py-2 text-zinc-600">{r.company}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{locOf(r) || '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{s ? s.job_title : '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.status}
                      onChange={(e) =>
                        void setProspectStatus(r.id, e.target.value as ProspectStatus).catch((err) =>
                          flash(err instanceof Error ? `Could not save: ${err.message}` : 'Could not save')
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${PROSPECT_TONE[r.status]}`}
                    >
                      {PROSPECT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {PROSPECT_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {r.sent_at ? formatShortDate(r.sent_at) : '—'}
                    {r.sent_by && <span className="text-zinc-400"> · {r.sent_by.split(' ')[0]}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      title="Copy first message"
                      onClick={async () =>
                        flash((await copyMessage(fillTemplate(settings.tpl1, r))) ? 'Message 1 copied' : 'Could not copy')
                      }
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      title="Copy reply message"
                      onClick={async () =>
                        flash((await copyMessage(fillTemplate(settings.tpl2, r))) ? 'Reply copied' : 'Could not copy')
                      }
                      className="rounded px-1.5 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      Msg 2
                    </button>
                    {r.status === 'interested' && (
                      <button
                        title="Add as candidate"
                        onClick={() => openAddCandidate({ full_name: r.name, linkedin_url: r.linkedin_url })}
                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete ${r.name} from the list?`)) void deleteProspect(r.id)
                      }}
                      className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-zinc-400">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className="mx-auto block rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          Show {Math.min(PAGE, filtered.length - limit)} more
        </button>
      )}
    </div>
  )
}
