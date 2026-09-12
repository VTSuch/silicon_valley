'use client'

import { useState } from 'react'
import { CandidateStatus } from '@/types'
import { Granularity, formatFullPeriod } from '@/lib/dates'
import ChartTooltip, { useCursorTooltip } from './ChartTooltip'

/**
 * The three moments worth counting per period, in funnel order: every booking
 * starts as an invite, and only some of those end up in front of a client.
 * Left to right, the group should step down.
 */
export const ACTIVITY_SERIES: { id: CandidateStatus; label: string; fill: string }[] = [
  { id: 'calendly_sent', label: 'Calendly sent', fill: '#f59e0b' },
  { id: 'calendly_booked', label: 'Calendly booked', fill: '#8b5cf6' },
  { id: 'submitted', label: 'Submitted', fill: '#3b82f6' },
]

export interface ActivityBucket {
  start: Date
  label: string
  counts: Record<string, number>
}

/**
 * Grouped bars: one cluster per period, one bar per stage, side by side rather
 * than stacked — the point is the drop from one stage to the next, and a stack
 * hides exactly that.
 */
export default function ActivityBars({
  buckets,
  granularity,
}: {
  buckets: ActivityBucket[]
  granularity: Granularity
}) {
  const [hover, setHover] = useState<number | null>(null)
  const { ref, pos, onMouseMove, onMouseLeave } = useCursorTooltip()
  const max = Math.max(
    1,
    ...buckets.flatMap((b) => ACTIVITY_SERIES.map((s) => b.counts[s.id] ?? 0))
  )

  if (buckets.length === 0) {
    return <p className="py-16 text-center text-sm text-zinc-400">Nothing happened yet.</p>
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        onMouseLeave()
        setHover(null)
      }}
    >
      <div className="flex gap-2">
        <div className="flex w-6 flex-col justify-between py-1 text-right text-[0.625rem] tabular-nums text-zinc-400">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f}>{Math.round(max * f)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-px w-full bg-zinc-100" />
            ))}
          </div>

          <div className="relative flex h-56 items-end gap-1.5">
            {buckets.map((b, i) => (
              <div
                key={b.label}
                className={`flex min-w-0 flex-1 items-end justify-center gap-[1.5px] self-stretch transition-opacity ${
                  hover !== null && hover !== i ? 'opacity-40' : ''
                }`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {/* A hairline between the three bars: enough to tell them
                    apart, tight enough that they still read as one group. */}
                {ACTIVITY_SERIES.map((s) => {
                  const count = b.counts[s.id] ?? 0
                  return (
                    <div
                      key={s.id}
                      className="min-w-0 flex-1 self-end"
                      style={{
                        height: `${(count / max) * 100}%`,
                        backgroundColor: s.fill,
                      }}
                      title={`${s.label}: ${count}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5">
            {buckets.map((b, i) => (
              <div
                key={b.label}
                className={`min-w-0 flex-1 truncate text-center text-[0.625rem] ${
                  hover === i ? 'font-semibold text-zinc-900' : 'text-zinc-400'
                }`}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hover !== null && buckets[hover] && (
        <ChartTooltip pos={pos}>
          <div className="mb-2 text-sm font-semibold text-zinc-900">
            {formatFullPeriod(buckets[hover].start, granularity)}
          </div>
          <ul className="space-y-1">
            {ACTIVITY_SERIES.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="font-medium">{s.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {buckets[hover].counts[s.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </ChartTooltip>
      )}
    </div>
  )
}

export function ActivityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {ACTIVITY_SERIES.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}
