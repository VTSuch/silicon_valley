'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Prospect } from '@/types'
import { OutreachSettings, computeStats, sentInWeek, sentPerDay } from '@/lib/outreach'
import { addDays, startOfDay, startOfWeek } from '@/lib/dates'

const fmt = (d: Date, withYear = false) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })

/**
 * The numbers for a set of prospects: all searches together, or the selected one.
 * A few narrow KPI tiles on the left, and on the right how many went out in any calendar week.
 */
export default function OutreachStats({
  rows,
  settings,
}: {
  rows: Prospect[]
  settings: OutreachSettings
}) {
  const s = useMemo(() => computeStats(rows), [rows])
  // 0 = this week, -1 = last week, …
  const [offset, setOffset] = useState(0)

  const thisMonday = startOfWeek(new Date())
  const weekStart = addDays(thisMonday, offset * 7)
  const weekEnd = addDays(weekStart, 6)
  const weekTotal = sentInWeek(rows, weekStart)
  const perDay = sentPerDay(rows, weekStart)
  const todayStart = startOfDay(new Date()).getTime()
  const isCurrent = offset === 0

  const nearWeek = s.thisWeek >= settings.weekLimit * 0.9
  const nearDay = s.today >= settings.dayWarn

  return (
    <div className="space-y-3">
      {(nearWeek || nearDay) && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            nearWeek
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {nearWeek
            ? `${s.thisWeek} sent this week (limit ${settings.weekLimit}, counted Monday to Sunday). Stop for now.`
            : `${s.today} sent today. Going past ~${settings.dayWarn} a day raises the risk of a restriction.`}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="grid shrink-0 grid-cols-3 gap-2 sm:w-[24rem]">
          <Tile label="Pending" value={s.pending} />
          <Tile label="Today" value={s.today} />
          <Tile
            label="This week"
            value={
              <>
                {s.thisWeek}
                <span className="text-xs font-normal text-zinc-400"> /{settings.weekLimit}</span>
              </>
            }
            warn={nearWeek}
          />
          <Tile label="Sent" value={s.sent} />
          <Tile label="Skipped" value={s.skipped} />
          <Tile label="Rejected" value={s.rejected} />
        </div>

        {/* Messages sent in a calendar week, with arrows to move between weeks. */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <WeekArrow dir="prev" onClick={() => setOffset((o) => o - 1)} />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3 md:flex-row md:justify-center md:gap-8">
            <div className="shrink-0 text-center">
              <div className="text-xs font-medium text-zinc-500">
                {isCurrent ? 'This week' : offset === -1 ? 'Last week' : `${-offset} weeks ago`}
                <span className="font-normal text-zinc-400">
                  {' '}
                  · {fmt(weekStart)} – {fmt(weekEnd, true)}
                </span>
              </div>
              <div className="mt-1 text-5xl font-semibold leading-none tabular-nums text-zinc-900">{weekTotal}</div>
              <div className="mt-1.5 text-xs text-zinc-400">
                sent{isCurrent ? ` · limit ${settings.weekLimit}` : ''}
              </div>
            </div>

            {/* Mon–Sun: how many went out each day. */}
            <div className="grid w-full max-w-sm grid-cols-7 gap-1.5 md:w-auto md:max-w-none">
              {perDay.map((n, i) => {
                const day = addDays(weekStart, i)
                const isToday = day.getTime() === todayStart
                const future = day.getTime() > todayStart
                return (
                  <div
                    key={i}
                    className={`min-w-[2.75rem] rounded-lg border px-1.5 py-1.5 text-center ${
                      isToday ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white'
                    } ${future ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-[10px] font-medium uppercase ${isToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-semibold tabular-nums leading-tight">{n}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <WeekArrow dir="next" disabled={isCurrent} onClick={() => setOffset((o) => Math.min(0, o + 1))} />
        </div>
      </div>
    </div>
  )
}

function WeekArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous week' : 'Next week'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function Tile({
  label,
  value,
  warn,
}: {
  label: string
  value: React.ReactNode
  warn?: boolean
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
      <div className="flex items-center gap-1 truncate text-[11px] font-medium text-zinc-500">
        {label}
        {warn && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums leading-tight text-zinc-900">{value}</div>
    </div>
  )
}
