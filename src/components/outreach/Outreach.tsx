'use client'

import { useMemo, useState } from 'react'
import { MapPin, Plus, Search as SearchIcon, Trash2, X } from 'lucide-react'
import { OutreachProvider, useOutreach } from '@/context/OutreachContext'
import { computeStats, pct } from '@/lib/outreach'
import { formatDate } from '@/lib/dates'
import OutreachStats from './OutreachStats'
import QueueView from './QueueView'
import ListView from './ListView'
import ReviewView from './ReviewView'
import ImportView from './ImportView'
import SetupView from './SetupView'
import NewSearchModal from './NewSearchModal'

type View = 'queue' | 'list' | 'skipped' | 'rejected' | 'import' | 'setup'

/** The text typed in the Searches finder survives switching tabs, until you clear it. */
const FINDER_KEY = 'sv-outreach-finder'
const readFinder = () => {
  try {
    return sessionStorage.getItem(FINDER_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function Outreach() {
  return (
    <OutreachProvider>
      <OutreachInner />
    </OutreachProvider>
  )
}

function OutreachInner() {
  const { searches, prospects, settings, loading, error, ready, deleteSearch } = useOutreach()
  // null = every search together. Selecting a search filters stats, queue, list and skipped.
  const [searchId, setSearchId] = useState<string | null>(null)
  const [view, setView] = useState<View>('queue')
  const [newOpen, setNewOpen] = useState(false)
  const [finder, setFinder] = useState(readFinder)
  const updateFinder = (v: string) => {
    setFinder(v)
    try {
      if (v) sessionStorage.setItem(FINDER_KEY, v)
      else sessionStorage.removeItem(FINDER_KEY)
    } catch {
      /* private mode: it just won't persist */
    }
  }

  const search = searchId ? (searches.find((s) => s.id === searchId) ?? null) : null
  const rows = useMemo(
    () => (search ? prospects.filter((p) => p.search_id === search.id) : prospects),
    [prospects, search]
  )
  const counts = useMemo(() => computeStats(rows), [rows])

  // The finder matches title and location in one field; every word has to match.
  const shownSearches = useMemo(() => {
    const words = finder.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return searches
    return searches.filter((s) => {
      const hay = `${s.job_title} ${s.location ?? ''}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [searches, finder])

  if (loading) return <div className="py-24 text-center text-sm text-zinc-400">Loading…</div>

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">One-time setup needed</p>
        <p className="mt-1">
          Run <code>supabase/migrations/017_outreach.sql</code> (and 018) in the Supabase SQL editor, then reload
          this page.
        </p>
      </div>
    )
  }

  const select = (id: string) => {
    // Clicking the selected search again clears the filter.
    if (searchId === id) setSearchId(null)
    else {
      setSearchId(id)
      if (view === 'setup') setView('queue')
    }
  }

  const tabs: { id: View; label: string; n?: number }[] = [
    { id: 'queue', label: 'Queue', n: counts.pending },
    { id: 'list', label: 'List', n: rows.length },
    { id: 'skipped', label: 'Skipped', n: counts.skipped },
    { id: 'rejected', label: 'Rejected', n: counts.rejected },
    { id: 'import', label: 'Import CSV' },
    { id: 'setup', label: 'Setup' },
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">Extraction &amp; Outreach</h1>
        <span className="text-xs text-zinc-400">
          {search
            ? `${search.job_title}${search.location ? ` · ${search.location}` : ''}`
            : 'All searches together'}
        </span>
      </div>

      <OutreachStats rows={rows} settings={settings} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Searches ------------------------------------------------------------- */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Searches</h2>
            <button
              onClick={() => setSearchId(null)}
              disabled={!search}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                search
                  ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-400'
              }`}
              title="Remove the filter"
            >
              All searches
            </button>
          </div>

          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={finder}
              onChange={(e) => updateFinder(e.target.value)}
              placeholder="Title or location…"
              className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-7 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
            />
            {finder && (
              <button
                onClick={() => updateFinder('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Clear the finder"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {shownSearches.map((s) => {
              const r = prospects.filter((p) => p.search_id === s.id)
              const st = computeStats(r)
              const active = s.id === searchId
              return (
                <button
                  key={s.id}
                  onClick={() => select(s.id)}
                  aria-pressed={active}
                  className={`block w-full rounded-lg border p-2.5 text-left transition ${
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                      : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  <div className="truncate text-sm font-medium">{s.job_title}</div>
                  <div className={`mt-0.5 flex items-center gap-1 truncate text-[11px] ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {s.location && (
                      <>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.location}</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="shrink-0">{formatDate(s.created_at)}</span>
                  </div>
                  <div className={`mt-2 grid grid-cols-4 gap-1 text-[11px] ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    <Mini label="total" value={r.length} active={active} />
                    <Mini label="pend." value={st.pending} active={active} />
                    <Mini label="sent" value={st.sent} active={active} />
                    <Mini label="acc." value={pct(st.acceptanceRate)} active={active} />
                  </div>
                </button>
              )
            })}

            {shownSearches.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-4 text-center text-xs text-zinc-500">
                {searches.length === 0 ? 'No searches yet.' : 'No search matches.'}
              </p>
            )}

            <button
              onClick={() => setNewOpen(true)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" />
              New search
            </button>
          </div>
        </aside>

        {/* Work area -------------------------------------------------------------- */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-zinc-200">
            <div className="flex min-w-0 gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                  view === t.id
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {t.label}
                {t.n !== undefined && (
                  <span className="rounded-full bg-zinc-100 px-1.5 text-[11px] tabular-nums text-zinc-500">
                    {t.n}
                  </span>
                )}
              </button>
            ))}
            </div>

            {/* Same row as the tabs, so showing it never pushes the cards down. */}
            {search && (
              <div className="mb-2 flex min-w-0 shrink items-center gap-1.5 text-xs text-zinc-400">
                <span
                  className="truncate"
                  title={`Created ${formatDate(search.created_at)}${search.created_by ? ` by ${search.created_by}` : ''}${search.notes ? ` · ${search.notes}` : ''}`}
                >
                  Created {formatDate(search.created_at)}
                  {search.created_by ? ` by ${search.created_by.split(' ')[0]}` : ''}
                  {search.notes ? ` · ${search.notes}` : ''}
                </span>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${search.job_title}" and its ${rows.length} prospects? This cannot be undone.`)) {
                      void deleteSearch(search.id).then(() => setSearchId(null))
                    }
                  }}
                  className="shrink-0 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                  title="Delete this search"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {view === 'queue' && (
            <QueueView key={search?.id ?? 'all'} rows={rows} searches={searches} showSearch={!search} />
          )}
          {view === 'list' && <ListView rows={rows} searches={searches} />}
          {view === 'skipped' && <ReviewView status="skipped" rows={rows} searches={searches} showSearch={!search} />}
          {view === 'rejected' && <ReviewView status="rejected" rows={rows} searches={searches} showSearch={!search} />}
          {view === 'import' &&
            (search ? (
              <ImportView search={search} onDone={() => setView('queue')} />
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-14 text-center text-sm text-zinc-500">
                Select a search on the left (or create one) to import its CSV.
              </div>
            ))}
          {view === 'setup' && <SetupView />}
        </div>
      </div>

      <NewSearchModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          setSearchId(id)
          setView('import')
        }}
      />
    </div>
  )
}

function Mini({ label, value, active }: { label: string; value: React.ReactNode; active: boolean }) {
  return (
    <span className="min-w-0">
      <b className={`block text-sm font-semibold tabular-nums ${active ? 'text-white' : 'text-zinc-900'}`}>{value}</b>
      {label}
    </span>
  )
}
