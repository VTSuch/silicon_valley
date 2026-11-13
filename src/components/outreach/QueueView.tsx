'use client'

import { useMemo, useState } from 'react'
import { Ban, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, ExternalLink, Inbox, SkipForward } from 'lucide-react'
import { OutreachSearch, Prospect, ProspectStatus } from '@/types'
import { useOutreach } from '@/context/OutreachContext'
import { PROSPECT_LABEL, PROSPECT_TONE, copyMessage, fillTemplate } from '@/lib/outreach'

/**
 * Where a card sits relative to the current one, as a fraction of the card width.
 * The current card (0) is on top; its neighbours are slightly smaller, a bit see-through and tucked
 * under it. Cards two steps away wait off-screen, invisible, so entering and leaving also slide.
 */
const SLOT: Record<number, { x: number; scale: number; z: number; opacity: number }> = {
  [-2]: { x: -0.98, scale: 0.8, z: 10, opacity: 0 },
  [-1]: { x: -0.64, scale: 0.9, z: 20, opacity: 0.68 },
  0: { x: 0, scale: 1, z: 30, opacity: 1 },
  1: { x: 0.64, scale: 0.9, z: 20, opacity: 0.68 },
  2: { x: 0.98, scale: 0.8, z: 10, opacity: 0 },
}

/** The deck is the prospects plus one last card that says the queue is finished. */
type Item = { kind: 'p'; p: Prospect } | { kind: 'done' }
const itemId = (i: Item) => (i.kind === 'p' ? i.p.id : 'done')

type Decision = 'sent' | 'skipped' | 'rejected'

/** What you decided for a card. Anything past "sent" (accepted, replied…) counts as sent. */
const decisionOf = (s: ProspectStatus): Decision | null =>
  s === 'pending' ? null : s === 'skipped' ? 'skipped' : s === 'rejected' ? 'rejected' : 'sent'

/** Card background and border for each decision: a hint of colour, never loud. */
const CARD_TINT: Record<Decision | 'none', string> = {
  none: 'border-zinc-200 bg-white',
  sent: 'border-emerald-200 bg-emerald-50/60',
  skipped: 'border-amber-200 bg-amber-50/60',
  rejected: 'border-red-200 bg-red-50/50',
}

/**
 * One prospect at a time, as a deck. The queue is a row of cards and a cursor on it: what you
 * already handled sits on the left, what is left on the right. Going back is only moving along
 * the row; it never changes a status. Each card keeps the colour of what you decided, and the
 * button you pressed stays highlighted until you press another one.
 *
 * LinkedIn stays manual on purpose: this opens the profile and copies the message; you press
 * Connect, paste and Send yourself.
 */
export default function QueueView({
  rows,
  searches,
  showSearch,
}: {
  rows: Prospect[]
  searches: OutreachSearch[]
  /** Label each prospect with its search (queue of all searches). */
  showSearch: boolean
}) {
  const { settings, setProspectStatus } = useOutreach()
  const [toast, setToast] = useState<string | null>(null)
  /** Prospects handled in this session, in the order you handled them. */
  const [trail, setTrail] = useState<string[]>([])
  /** Position in the deck. It can sit on any handled card; the next fresh one is at trail.length. */
  const [cursor, setCursor] = useState(0)

  // Oldest search first, then import order.
  const pending = useMemo(() => {
    const created = new Map(searches.map((s) => [s.id, new Date(s.created_at).getTime()]))
    const handled = new Set(trail)
    return rows
      .filter((r) => r.status === 'pending' && !handled.has(r.id))
      .sort(
        (a, b) =>
          (created.get(a.search_id) ?? 0) - (created.get(b.search_id) ?? 0) || a.position - b.position
      )
  }, [rows, searches, trail])

  // The whole deck in order: what you already went through, what is left, then the "done" card.
  const { deck, handledCount } = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]))
    const handled = trail.map((id) => byId.get(id)).filter((p): p is Prospect => !!p)
    const items: Item[] = [
      ...handled.map((p): Item => ({ kind: 'p', p })),
      ...pending.map((p): Item => ({ kind: 'p', p })),
      { kind: 'done' },
    ]
    return { deck: items, handledCount: handled.length }
  }, [rows, trail, pending])

  const ci = Math.min(cursor, deck.length - 1)
  const current = deck[ci]
  const currentP = current.kind === 'p' ? current.p : null
  /** True when the current card is a fresh one, not one you already went back to. */
  const atFrontier = ci >= handledCount
  const canGoForward = ci < handledCount

  const handledItems = deck.slice(0, handledCount)
  const summary = {
    sent: handledItems.filter((i) => i.kind === 'p' && decisionOf(i.p.status) === 'sent').length,
    skipped: handledItems.filter((i) => i.kind === 'p' && i.p.status === 'skipped').length,
    rejected: handledItems.filter((i) => i.kind === 'p' && i.p.status === 'rejected').length,
    total: handledCount,
    skippedInList: rows.filter((r) => r.status === 'skipped').length,
  }

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }
  const fail = (e: unknown) => flash(e instanceof Error ? `Could not save: ${e.message}` : 'Could not save')
  const searchLabel = (p: Prospect) => {
    const s = searches.find((x) => x.id === p.search_id)
    return s ? `${s.job_title}${s.location ? ` · ${s.location}` : ''}` : null
  }

  /** Decide for the current card and move on. On a card you went back to, only a different choice saves. */
  const act = (decision: Decision) => {
    if (!currentP) return
    const wasFrontier = atFrontier
    if (wasFrontier) setTrail((t) => [...t, currentP.id])
    setCursor(ci + 1)
    if (decisionOf(currentP.status) === decision) return // same choice: nothing to save
    // The status change is optimistic: the card moves at once, the database catches up behind it.
    setProspectStatus(currentP.id, decision).catch((e) => {
      if (wasFrontier) setTrail((t) => t.filter((id) => id !== currentP.id))
      setCursor(ci)
      fail(e)
    })
  }

  const back = () => setCursor(Math.max(0, ci - 1))
  const forward = () => canGoForward && setCursor(ci + 1)

  const openAndCopy = () => {
    if (!currentP) return
    // Must start inside the click so the browser allows the clipboard write.
    const copied = copyMessage(fillTemplate(settings.tpl1, currentP))
    window.open(currentP.linkedin_url, 'li_tab')
    void copied.then((ok) =>
      flash(ok ? 'Message copied — now Connect, paste, Send' : 'Could not copy: use "Copy"')
    )
  }
  const copyOnly = async () => {
    if (currentP) flash((await copyMessage(fillTemplate(settings.tpl1, currentP))) ? 'Message copied' : 'Could not copy')
  }

  const cardProps = (p: Prospect) => ({
    p,
    message: fillTemplate(settings.tpl1, p),
    limit: settings.charLimit,
    search: showSearch ? searchLabel(p) : null,
  })

  // Only a window around the current card is drawn.
  const visible = deck.slice(Math.max(0, ci - 2), ci + 3)

  // The invisible sizer gives the stage its height. At the end it copies the last real card, so
  // the "done" card is exactly as tall and nothing jumps.
  const prevItem = deck[ci - 1]
  const sizer = currentP ?? (prevItem?.kind === 'p' ? prevItem.p : null)

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-500">{pending.length} pending</div>

      <div className="relative overflow-hidden px-2 py-4">
        <div aria-hidden className="pointer-events-none invisible mx-auto w-[var(--card-w)]">
          {sizer ? <DeckCard {...cardProps(sizer)} d={0} /> : <div className="h-64" />}
        </div>

        {visible.map((item) => {
          const d = deck.indexOf(item) - ci
          const slot = SLOT[d]
          const clickable = d === -1 || (d === 1 && canGoForward)
          return (
            <div
              key={itemId(item)}
              className="absolute bottom-4 top-4 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
              style={{
                left: '50%',
                width: 'var(--card-w)',
                marginLeft: 'calc(var(--card-w) / -2)',
                transform: `translateX(calc(var(--card-w) * ${slot.x})) scale(${slot.scale})`,
                zIndex: slot.z,
                opacity: slot.opacity,
                pointerEvents: d === 0 || clickable ? 'auto' : 'none',
              }}
            >
              {item.kind === 'p' ? (
                <DeckCard
                  {...cardProps(item.p)}
                  d={d}
                  onClick={d === -1 ? back : d === 1 && canGoForward ? forward : undefined}
                  onOpen={openAndCopy}
                  onCopy={copyOnly}
                  onAct={act}
                />
              ) : (
                <DoneCard {...summary} />
              )}
            </div>
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

/** The decision buttons: the one you chose is drawn stronger, the others stay quiet. */
const DECISION_BTN: Record<Decision, { base: string; chosen: string }> = {
  skipped: {
    base: 'border-amber-200/80 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80',
    chosen: 'border-amber-500 bg-amber-100 text-amber-800 ring-1 ring-amber-400',
  },
  rejected: {
    base: 'border-red-200/80 bg-red-50/70 text-red-500 hover:bg-red-100/80',
    chosen: 'border-red-500 bg-red-100 text-red-700 ring-1 ring-red-400',
  },
  sent: {
    base: 'border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    chosen: 'border-emerald-600 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500',
  },
}

function DeckCard({
  p,
  d,
  message,
  limit,
  search,
  onClick,
  onOpen,
  onCopy,
  onAct,
}: {
  p: Prospect
  /** -1 = before the current card, 0 = current, 1 = after it. */
  d: number
  message: string
  limit: number
  search: string | null
  onClick?: () => void
  onOpen?: () => void
  onCopy?: () => void
  onAct?: (decision: Decision) => void
}) {
  const live = d === 0
  const over = message.length > limit
  const decision = decisionOf(p.status)

  const decisionButton = (which: Decision, icon: React.ReactNode, label: string, title?: string) => (
    <button
      onClick={() => onAct?.(which)}
      title={title}
      aria-pressed={decision === which}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition ${
        decision === which
          ? `${DECISION_BTN[which].chosen} font-semibold`
          : `${DECISION_BTN[which].base} ${which === 'sent' ? 'font-semibold' : 'font-medium'}`
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <section
      onClick={onClick}
      className={`h-full overflow-hidden rounded-2xl border transition-colors duration-300 ${
        CARD_TINT[decision ?? 'none']
      } ${live ? 'shadow-xl shadow-zinc-900/10' : 'shadow-md shadow-zinc-900/5'} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Side cards are display only: nothing inside them can be focused or clicked. */}
      <div {...(!live ? { inert: true } : {})} className={`flex h-full flex-col ${!live ? 'select-none' : ''}`}>
        <div className="border-b border-black/5 p-5">
          <div className="mb-2 flex min-h-[1.5rem] items-center justify-between gap-2">
            {search ? (
              <span className="truncate rounded-full bg-white/70 px-2 py-0.5 text-xs text-zinc-600">{search}</span>
            ) : (
              <span />
            )}
            <span className="flex shrink-0 items-center gap-2">
              {decision && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PROSPECT_TONE[p.status]}`}>
                  {PROSPECT_LABEL[p.status]}
                </span>
              )}
              {d === -1 && (
                <span className="inline-flex items-center gap-0.5 text-xs text-zinc-500">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </span>
              )}
              {d === 1 && onClick && (
                <span className="inline-flex items-center gap-0.5 text-xs text-zinc-500">
                  Forward <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
              {d === 1 && !onClick && !decision && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">Next</span>
              )}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">{p.name}</h2>
          <p className="mt-0.5 text-sm text-zinc-600">{[p.title, p.company].filter(Boolean).join(' @ ')}</p>
          {p.location && <p className="text-xs text-zinc-400">{p.location}</p>}
          <a
            href={p.linkedin_url}
            target="li_tab"
            rel="noreferrer"
            className="mt-1 inline-block break-all text-xs text-blue-600 hover:underline"
          >
            {p.linkedin_url}
          </a>
        </div>

        <div className="flex-1 p-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-500">Message</span>
            <span className={`tabular-nums ${over ? 'font-semibold text-red-600' : 'text-zinc-400'}`}>
              {message.length} / {limit}
            </span>
          </div>
          <div className="whitespace-pre-wrap rounded-lg border border-black/5 bg-white/70 p-3 text-sm text-zinc-800">
            {message}
          </div>
          {over && (
            <p className="mt-1.5 text-xs text-red-600">
              Over the connection-note limit. Shorten the template in Setup, or send it as a message instead of a
              note.
            </p>
          )}
        </div>

        <div className="space-y-2.5 border-t border-black/5 bg-white/40 p-4">
          {/* Getting to the person… */}
          <div className="flex gap-2">
            <button
              onClick={onOpen}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-[#0a66c2] transition hover:bg-sky-100"
            >
              <ExternalLink className="h-4 w-4" />
              Open LinkedIn &amp; copy
            </button>
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
          {/* …and what you decided. */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
            {decisionButton('skipped', <SkipForward className="h-4 w-4" />, 'Skip', 'Not now: review it later in Skipped')}
            {decisionButton('rejected', <Ban className="h-4 w-4" />, 'Reject', "Don't contact this person")}
            {decisionButton('sent', <Check className="h-4 w-4" />, 'Mark as sent')}
          </div>
        </div>
      </div>
    </section>
  )
}

/** The last card of the deck: the queue is finished (or there was nothing to send). */
function DoneCard({
  sent,
  skipped,
  rejected,
  total,
  skippedInList,
}: {
  sent: number
  skipped: number
  rejected: number
  total: number
  skippedInList: number
}) {
  const nothing = total === 0
  return (
    <section className="flex h-full flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-8 text-center shadow-xl shadow-zinc-900/10">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          nothing ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-100/70 text-emerald-500'
        }`}
      >
        {nothing ? <Inbox className="h-7 w-7" /> : <CheckCircle2 className="h-8 w-8" />}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">{nothing ? 'Nothing in the queue' : 'Queue complete'}</h2>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">
        {nothing
          ? 'Import a CSV from a search to fill it.'
          : `You went through ${total} ${total === 1 ? 'person' : 'people'}.`}
      </p>
      {!nothing && (
        <div className="mt-4 flex gap-5 text-xs text-zinc-500">
          <span>
            <b className="block text-base font-semibold tabular-nums text-emerald-600">{sent}</b>sent
          </span>
          <span>
            <b className="block text-base font-semibold tabular-nums text-amber-600">{skipped}</b>skipped
          </span>
          <span>
            <b className="block text-base font-semibold tabular-nums text-red-500">{rejected}</b>rejected
          </span>
        </div>
      )}
      {skippedInList > 0 && <p className="mt-5 text-xs text-zinc-400">{skippedInList} still waiting in the Skipped tab.</p>}
    </section>
  )
}
