'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, Link2, Plus, RefreshCw, Video, X } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { Call } from '@/types'
import { formatSlot } from '@/lib/dates'
import { normalizeStatus, statusMeta } from '@/lib/status'

/**
 * The calls Calendly says are coming. A booking the matcher could not place
 * with confidence still shows up here — as a question rather than a fact —
 * because a call nobody has linked is exactly the one worth noticing.
 */
export default function UpcomingCalls() {
  const { calls, candidates, syncCalls, syncingCalls, linkCall } = useData()
  const { openCandidate, openAddCandidate } = useUI()
  const [picking, setPicking] = useState<string | null>(null)
  // Held in state and ticked, so a call drops off the list once it is over
  // without needing the page reloaded.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const upcoming = useMemo(() => {
    // A call already under way still counts as upcoming for another hour.
    const floor = now - 3_600_000
    return calls
      .filter((c) => c.status === 'active' && new Date(c.starts_at).getTime() >= floor)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [calls, now])

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <CalendarClock className="h-4 w-4 text-sky-500" />
          Upcoming calls
          <span className="font-normal text-zinc-400">({upcoming.length})</span>
        </h2>
        <button
          onClick={() => void syncCalls()}
          disabled={syncingCalls}
          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
          title="Pull the latest bookings from Calendly"
        >
          <RefreshCw className={`h-4 w-4 ${syncingCalls ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="max-h-[420px] overflow-y-auto">
        {upcoming.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-zinc-400">
            No calls booked. Anything scheduled through Calendly turns up here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {upcoming.map((call) => {
              const candidate = call.candidate_id ? byId.get(call.candidate_id) : null
              const unsure = call.match === 'suggested'
              return (
                <li key={call.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-sm font-medium text-zinc-900">
                          {candidate?.full_name ?? call.invitee_name}
                        </span>
                        {candidate && (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              statusMeta(normalizeStatus(candidate.status)).dot
                            }`}
                            title={statusMeta(normalizeStatus(candidate.status)).label}
                          />
                        )}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {formatSlot(call.starts_at)}
                        {candidate?.role ? ` · ${candidate.role.company}` : ''}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {call.join_url && (
                        <a
                          href={call.join_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                          title="Join the call"
                        >
                          <Video className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {candidate && !unsure && (
                        <button
                          onClick={() => openCandidate(candidate.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>

                  {/* A guess, shown as one: confirm it or pick somebody else. */}
                  {unsure && candidate && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2 py-1.5">
                      <span className="text-xs text-amber-900">
                        Booked by <span className="font-medium">{call.invitee_name}</span> — is this{' '}
                        {candidate.full_name}?
                      </span>
                      <button
                        onClick={() => void linkCall(call.id, candidate.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-900 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white transition hover:bg-amber-800"
                      >
                        <Check className="h-3 w-3" />
                        Yes
                      </button>
                      <button
                        onClick={() => setPicking(picking === call.id ? null : call.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber-900 transition hover:border-amber-500"
                      >
                        <X className="h-3 w-3" />
                        No
                      </button>
                    </div>
                  )}

                  {!candidate && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        Booked by {call.invitee_name}
                        {call.invitee_email ? ` · ${call.invitee_email}` : ''}
                      </span>
                      <button
                        onClick={() => setPicking(picking === call.id ? null : call.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
                      >
                        <Link2 className="h-3 w-3" />
                        Link
                      </button>
                      <button
                        onClick={() =>
                          openAddCandidate({
                            full_name: call.invitee_name,
                            email: call.invitee_email ?? undefined,
                            notes: call.notes ?? undefined,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  )}

                  {picking === call.id && (
                    <CandidatePicker
                      call={call}
                      onPick={async (candidateId) => {
                        await linkCall(call.id, candidateId)
                        setPicking(null)
                      }}
                      onClose={() => setPicking(null)}
                    />
                  )}

                  {call.notes && (
                    <p className="mt-1.5 line-clamp-2 text-xs italic text-zinc-400">
                      “{call.notes}”
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Search over candidates, the ones we are waiting on first. */
function CandidatePicker({
  call,
  onPick,
  onClose,
}: {
  call: Call
  onPick: (candidateId: string) => void
  onClose: () => void
}) {
  const { candidates } = useData()
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return candidates
      .filter((c) => !q || c.full_name.toLowerCase().includes(q))
      .sort((a, b) => {
        // Whoever we have just sent a link to is the likeliest answer.
        const rank = (s: string) =>
          normalizeStatus(s) === 'calendly_sent' ? 0 : statusMeta(normalizeStatus(s)).active ? 1 : 2
        return rank(a.status) - rank(b.status) || a.full_name.localeCompare(b.full_name)
      })
      .slice(0, 8)
  }, [candidates, query])

  return (
    <div className="mt-2 rounded-lg border border-zinc-200 p-2">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Who is ${call.invitee_name}?`}
        className="w-full rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
      />
      <ul className="mt-1 max-h-40 overflow-y-auto">
        {options.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onPick(c.id)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-50"
            >
              <span className="min-w-0 truncate">{c.full_name}</span>
              <span className="shrink-0 text-[0.625rem] text-zinc-400">
                {statusMeta(normalizeStatus(c.status)).short}
              </span>
            </button>
          </li>
        ))}
        {options.length === 0 && (
          <li className="px-2 py-2 text-xs text-zinc-400">Nobody by that name.</li>
        )}
      </ul>
      <button
        onClick={onClose}
        className="mt-1 w-full rounded-md px-2 py-1 text-[0.6875rem] font-medium text-zinc-500 hover:bg-zinc-50"
      >
        Cancel
      </button>
    </div>
  )
}
