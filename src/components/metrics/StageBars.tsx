'use client'

import { useState } from 'react'
import { METRIC_GROUPS, StageGroup } from '@/lib/status'
import { formatFullMonth } from '@/lib/dates'

export interface MonthBucket {
  month: Date
  label: string
  counts: Record<StageGroup, number>
  total: number
}

/**
 * Stacked bars, one per month, split by the furthest stage each candidate
 * reached. Candidates are counted in the month they were submitted, no matter
 * when the later stages happened.
 */
export default function StageBars({ buckets }: { buckets: MonthBucket[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...buckets.map((b) => b.total))

  if (buckets.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">
        No submissions in this period.
      </p>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-4">
        {/* y axis */}
        <div className="flex w-8 flex-col justify-between py-1 text-right text-[0.625rem] tabular-nums text-zinc-400">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f}>{Math.round(max * f)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-px w-full bg-zinc-100" />
            ))}
          </div>

          <div className="relative flex h-56 items-end gap-1 overflow-x-auto sm:gap-2">
            {buckets.map((b, i) => (
              <div
                key={b.label}
                className="group flex min-w-[28px] flex-1 flex-col items-center justify-end self-stretch"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={`flex w-full max-w-[64px] flex-col-reverse justify-start transition-opacity ${
                    hover !== null && hover !== i ? 'opacity-40' : ''
                  }`}
                  style={{ height: `${(b.total / max) * 100}%` }}
                >
                  {[...METRIC_GROUPS].reverse().map((g) => {
                    const count = b.counts[g.id] ?? 0
                    if (!count) return null
                    return (
                      <div
                        key={g.id}
                        style={{
                          height: `${(count / b.total) * 100}%`,
                          backgroundColor: g.fill,
                        }}
                        title={`${g.label}: ${count}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* x axis */}
          <div className="mt-2 flex gap-1 sm:gap-2">
            {buckets.map((b, i) => (
              <div
                key={b.label}
                className={`min-w-[28px] flex-1 text-center text-[0.625rem] ${
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
        <div className="pointer-events-none absolute right-0 top-0 z-10 w-52 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="mb-2 text-sm font-semibold text-zinc-900">
            {formatFullMonth(buckets[hover].month)}
          </div>
          <ul className="space-y-1">
            {METRIC_GROUPS.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5" style={{ color: g.fill }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.fill }} />
                  <span className="font-medium">{g.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {buckets[hover].counts[g.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
            <span className="text-zinc-500">Total submitted</span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {buckets[hover].total}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function StageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {[...METRIC_GROUPS].reverse().map((g) => (
        <span key={g.id} className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.fill }} />
          {g.label}
        </span>
      ))}
    </div>
  )
}
