'use client'

import { useMemo, useState } from 'react'
import { Granularity, formatFullPeriod } from '@/lib/dates'
import ChartTooltip, { useCursorTooltip } from './ChartTooltip'

export interface AreaSeries {
  id: string
  label: string
  fill: string
}

export interface AreaBucket {
  start: Date
  label: string
  counts: Record<string, number>
}

interface Point {
  x: number
  y: number
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson). A plain spline overshoots
 * between points, which on a cumulative chart would draw a curve dipping below
 * a total it has already reached — and make neighbouring bands cross. This one
 * cannot: between two points it stays between their values.
 */
function tangents(pts: Point[]): number[] {
  const n = pts.length
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    slopes.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x))
  }
  const out: number[] = new Array(n)
  out[0] = slopes[0] ?? 0
  out[n - 1] = slopes[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]
    const b = slopes[i]
    out[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  }
  return out
}

/** The curve through these points, as path commands. */
function curve(pts: Point[], move: boolean): string {
  if (pts.length === 0) return ''
  const head = `${move ? 'M' : 'L'}${pts[0].x},${pts[0].y}`
  if (pts.length === 1) return head
  const t = tangents(pts)
  let d = head
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const c1 = { x: pts[i].x + dx / 3, y: pts[i].y + (t[i] * dx) / 3 }
    const c2 = { x: pts[i + 1].x - dx / 3, y: pts[i + 1].y - (t[i + 1] * dx) / 3 }
    d += `C${c1.x},${c1.y} ${c2.x},${c2.y} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

/**
 * The same buckets as the bar charts, drawn as stacked cumulative curves:
 * each band is one category's running total across the visible window, and the
 * bands sit in funnel order — the furthest stages on top, the earliest at the
 * bottom. The totals restart at the left edge of the window, so the curves
 * answer "how did this window fill up", not "how much is there in total".
 *
 * `series` is ordered bottom-first.
 */
export default function CumulativeAreas({
  buckets,
  series,
  granularity,
  emptyLabel,
}: {
  buckets: AreaBucket[]
  series: AreaSeries[]
  granularity: Granularity
  emptyLabel: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const { ref, pos, onMouseMove, onMouseLeave } = useCursorTooltip()

  const { bands, totals, max } = useMemo(() => {
    const n = buckets.length
    /** Running total per series, and the stacked height under each band. */
    const running: Record<string, number> = {}
    const cumulative: Record<string, number[]> = {}
    for (const s of series) cumulative[s.id] = []
    for (let i = 0; i < n; i++) {
      for (const s of series) {
        running[s.id] = (running[s.id] ?? 0) + (buckets[i].counts[s.id] ?? 0)
        cumulative[s.id].push(running[s.id])
      }
    }

    const stacked: number[][] = []
    for (let k = 0; k < series.length; k++) {
      const below = stacked[k - 1]
      stacked.push(cumulative[series[k].id].map((v, i) => v + (below?.[i] ?? 0)))
    }
    const top = stacked[stacked.length - 1] ?? []
    return {
      bands: stacked,
      totals: cumulative,
      max: Math.max(1, ...top),
    }
  }, [buckets, series])

  if (buckets.length === 0) {
    return <p className="py-16 text-center text-sm text-zinc-400">{emptyLabel}</p>
  }

  const n = buckets.length
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - (v / max) * 100
  const points = (values: number[]) => values.map((v, i) => ({ x: x(i), y: y(v) }))

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
        {/* y axis */}
        <div className="flex w-6 flex-col justify-between py-1 text-right text-[0.625rem] tabular-nums text-zinc-400">
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

          <div className="relative h-56">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              {/* Painted top band first so the lower ones overlap its edge
                  cleanly; the list is bottom-first, so walk it backwards. */}
              {[...series].reverse().map((s) => {
                const k = series.indexOf(s)
                const top = points(bands[k])
                const below = k === 0 ? null : points(bands[k - 1])
                const base = below ?? top.map((p) => ({ x: p.x, y: 100 }))
                const d = `${curve(top, true)}${curve([...base].reverse(), false)}Z`
                return (
                  <g key={s.id}>
                    <path d={d} fill={s.fill} fillOpacity={0.85} />
                    <path
                      d={curve(top, true)}
                      fill="none"
                      stroke={s.fill}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )
              })}
            </svg>

            {/* Hover columns, one per period, over the curves. */}
            <div className="absolute inset-0 flex">
              {buckets.map((b, i) => (
                <div
                  key={b.label}
                  className="min-w-0 flex-1"
                  onMouseEnter={() => setHover(i)}
                />
              ))}
            </div>

            {hover !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-zinc-300"
                style={{ left: `${x(hover)}%` }}
              />
            )}
          </div>

          {/* x axis */}
          <div className="mt-2 flex">
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
            {[...series].reverse().map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="font-medium">{s.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {totals[s.id]?.[hover] ?? 0}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-zinc-100 pt-2 text-[0.6875rem] text-zinc-400">
            Running totals since the start of this window.
          </p>
        </ChartTooltip>
      )}
    </div>
  )
}
