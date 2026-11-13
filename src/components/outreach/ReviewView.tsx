'use client'

import { useState } from 'react'
import { Ban, Check, Copy, ExternalLink, RotateCcw, SkipForward } from 'lucide-react'
import { OutreachSearch, Prospect } from '@/types'
import { useOutreach } from '@/context/OutreachContext'
import { copyMessage, fillTemplate } from '@/lib/outreach'
import { formatShortDate } from '@/lib/dates'
import { GhostButton } from '@/components/common/Field'

type Reviewed = 'skipped' | 'rejected'

const COPY: Record<Reviewed, { empty: string; intro: string; verb: string }> = {
  skipped: {
    empty: 'Nothing skipped. People you skip in the queue land here so you can come back to them.',
    intro: 'Send one (open, paste, then Mark as sent), reject it, or send it back to the queue.',
    verb: 'skipped',
  },
  rejected: {
    empty: 'Nothing rejected. People you reject in the queue land here, in case you change your mind.',
    intro: 'Changed your mind? Send one (open, paste, then Mark as sent), skip it for later, or send it back to the queue.',
    verb: 'rejected',
  },
}

/**
 * The people you skipped for now, or rejected. Review each one: send it (open, copy, then Mark as
 * sent), move it to the other pile, or put it back in the queue.
 */
export default function ReviewView({
  status,
  rows,
  searches,
  showSearch,
}: {
  status: Reviewed
  rows: Prospect[]
  searches: OutreachSearch[]
  showSearch: boolean
}) {
  const { settings, setProspectStatus } = useOutreach()
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const skipped = rows
    .filter((r) => r.status === status)
    .sort((a, b) => new Date(b.status_at).getTime() - new Date(a.status_at).getTime())

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2600)
  }
  const set = async (p: Prospect, next: 'sent' | 'rejected' | 'skipped' | 'pending') => {
    setBusyId(p.id)
    try {
      await setProspectStatus(p.id, next)
    } catch (e) {
      flash(e instanceof Error ? `Could not save: ${e.message}` : 'Could not save')
    } finally {
      setBusyId(null)
    }
  }
  const openAndCopy = (p: Prospect) => {
    const copied = copyMessage(fillTemplate(settings.tpl1, p))
    window.open(p.linkedin_url, 'li_tab')
    void copied.then((ok) => flash(ok ? 'Message copied — now Connect, paste, Send' : 'Could not copy'))
  }

  if (skipped.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-500">
        {COPY[status].empty}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {skipped.length} {COPY[status].verb}. {COPY[status].intro}
      </p>
      <div className="grid gap-3 xl:grid-cols-2">
        {skipped.map((p) => {
          const s = searches.find((x) => x.id === p.search_id)
          return (
            <section key={p.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-zinc-900">{p.name}</h3>
                  <p className="truncate text-sm text-zinc-600">
                    {[p.title, p.company].filter(Boolean).join(' @ ')}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    {showSearch && s ? `${s.job_title}${s.location ? ` · ${s.location}` : ''} · ` : ''}
                    {COPY[status].verb} {formatShortDate(p.status_at)}
                  </p>
                </div>
                <a
                  href={p.linkedin_url}
                  target="li_tab"
                  rel="noreferrer"
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  title="Open LinkedIn profile"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <GhostButton onClick={() => openAndCopy(p)}>
                  <Copy className="h-4 w-4" />
                  Open &amp; copy
                </GhostButton>
                <GhostButton onClick={() => set(p, 'pending')} disabled={busyId === p.id} title="Back to the queue">
                  <RotateCcw className="h-4 w-4" />
                  Requeue
                </GhostButton>
                {status === 'skipped' ? (
                  <GhostButton
                    onClick={() => set(p, 'rejected')}
                    disabled={busyId === p.id}
                    className="border-red-200/80 bg-red-50/70 text-red-500 hover:bg-red-100/80"
                  >
                    <Ban className="h-4 w-4" />
                    Reject
                  </GhostButton>
                ) : (
                  <GhostButton
                    onClick={() => set(p, 'skipped')}
                    disabled={busyId === p.id}
                    className="border-amber-200/80 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </GhostButton>
                )}
                <button
                  onClick={() => set(p, 'sent')}
                  disabled={busyId === p.id}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  Mark as sent
                </button>
              </div>
            </section>
          )
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
