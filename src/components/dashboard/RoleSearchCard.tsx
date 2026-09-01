'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, RotateCcw, Search, UserSearch } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { Journey } from '@/lib/journey'
import RemindInMenu from '@/components/common/RemindInMenu'
import { formatDate, relativeDays } from '@/lib/dates'

/**
 * Candidates worth placing that have no role yet. A search can be snoozed,
 * which hides them here (but not from the Candidates tab) until the date.
 */
export default function RoleSearchCard({ journeys }: { journeys: Journey[] }) {
  const { updateCandidate, logFollowUp } = useData()
  const { openCandidate, openAddCandidate } = useUI()
  const [showSnoozed, setShowSnoozed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const { due, snoozed } = useMemo(() => {
    const now = new Date()
    const all = journeys.filter((j) => j.status === 'needs_role' || !j.candidate.role_id)
    const isSnoozed = (j: Journey) =>
      !!j.candidate.next_search_at && new Date(j.candidate.next_search_at) > now

    return {
      due: all
        .filter((j) => !isSnoozed(j))
        .sort((a, b) => b.daysInStatus - a.daysInStatus),
      snoozed: all
        .filter(isSnoozed)
        .sort(
          (a, b) =>
            new Date(a.candidate.next_search_at as string).getTime() -
            new Date(b.candidate.next_search_at as string).getTime()
        ),
    }
  }, [journeys])

  const snooze = async (id: string, until: Date) => {
    setBusy(id)
    try {
      await updateCandidate(id, { next_search_at: until.toISOString() })
      await logFollowUp(id, new Date(), 'Role search done')
    } finally {
      setBusy(null)
    }
  }

  /** Back to the Due list, whatever date was set. */
  const searchNow = async (id: string) => {
    setBusy(id)
    try {
      await updateCandidate(id, { next_search_at: null })
    } finally {
      setBusy(null)
    }
  }

  const list = showSnoozed ? snoozed : due

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <UserSearch className="h-4 w-4 text-fuchsia-500" />
          Looking for a role
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 text-xs">
          <button
            onClick={() => setShowSnoozed(false)}
            className={`rounded-md px-2 py-0.5 font-medium transition ${
              !showSnoozed ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
            }`}
          >
            Due {due.length}
          </button>
          <button
            onClick={() => setShowSnoozed(true)}
            className={`rounded-md px-2 py-0.5 font-medium transition ${
              showSnoozed ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
            }`}
          >
            Later {snoozed.length}
          </button>
        </div>
      </header>

      <div className="max-h-[420px] overflow-y-auto">
        {list.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-zinc-400">
            {showSnoozed ? 'Nothing snoozed.' : 'Nobody waiting for a role.'}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {list.map((j) => (
              <li key={j.candidate.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => openCandidate(j.candidate.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {j.candidate.full_name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
                      {showSnoozed ? (
                        <>
                          <CalendarClock className="h-3 w-3" />
                          From {formatDate(j.candidate.next_search_at)}
                        </>
                      ) : (
                        <>
                          Waiting {relativeDays(j.daysInStatus)}
                          {j.stale && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                              search due
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      openAddCandidate({
                        full_name: j.candidate.full_name,
                        email: j.candidate.email,
                        linkedin_url: j.candidate.linkedin_url ?? undefined,
                        notes: j.candidate.notes ?? undefined,
                        sourceCandidateId: j.candidate.id,
                      })
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
                    title="Assign a role to this candidate"
                  >
                    <Search className="h-3 w-3" />
                    Assign
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <RemindInMenu
                    onPick={(until) => snooze(j.candidate.id, until)}
                    disabled={busy === j.candidate.id}
                    label={showSnoozed ? 'Change reminder' : 'Searched — remind in'}
                  />
                  {showSnoozed && (
                    <button
                      onClick={() => searchNow(j.candidate.id)}
                      disabled={busy === j.candidate.id}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40"
                      title="Move back to the Due list"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Search now
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
