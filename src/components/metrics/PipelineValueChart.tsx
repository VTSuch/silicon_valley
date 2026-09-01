'use client'

import { useMemo, useState } from 'react'
import { formatShortDate } from '@/lib/dates'

export interface Contributor {
  id: string
  name: string
  company: string
  bounty: number
}

export interface ValuePoint {
  date: Date
  inPlay: number
  earned: number
  /** Who makes up `inPlay` on that date, biggest bounty first. */
  contributors: Contributor[]
}

const W = 800
const H = 220
const PAD = { top: 12, right: 8, bottom: 24, left: 52 }

/**
 * Bounty at risk over time: it rises when a candidate is submitted and drops
 * when they are rejected or hired. The second line is cumulative earned.
 */
export default function PipelineValueChart({
  points,
  onSelectCandidate,
}: {
  points: ValuePoint[]
  onSelectCandidate?: (id: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)

  const { inPlayPath, areaPath, earnedPath, max, x, y } = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => Math.max(p.inPlay, p.earned)))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH

    const line = (key: 'inPlay' | 'earned') =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')

    const inPlayPath = line('inPlay')
    const areaPath = points.length
      ? `${inPlayPath} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
      : ''

    return { inPlayPath, areaPath, earnedPath: line('earned'), max, x, y }
  }, [points])

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-zinc-400">Not enough history yet.</p>
  }

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`
  const active = hover !== null ? points[hover] : null

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const rel = ((e.clientX - rect.left) / rect.width) * W
          const innerW = W - PAD.left - PAD.right
          const i = Math.round(((rel - PAD.left) / innerW) * (points.length - 1))
          setHover(Math.min(points.length - 1, Math.max(0, i)))
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="#f4f4f5"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(max * f) + 3}
              textAnchor="end"
              className="fill-zinc-400"
              style={{ fontSize: 9 }}
            >
              {max * f >= 1000 ? `${Math.round((max * f) / 1000)}k` : Math.round(max * f)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="#18181b" opacity={0.06} />
        <path d={inPlayPath} fill="none" stroke="#18181b" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path
          d={earnedPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#a1a1aa"
              strokeWidth={1}
            />
            <circle cx={x(hover)} cy={y(points[hover].inPlay)} r={3.5} fill="#18181b" />
            <circle cx={x(hover)} cy={y(points[hover].earned)} r={3.5} fill="#10b981" />
          </g>
        )}

        {points
          .filter((_, i) => i % Math.max(1, Math.ceil(points.length / 8)) === 0)
          .map((p, idx, arr) => {
            const i = points.indexOf(p)
            return (
              <text
                key={p.date.toISOString()}
                x={x(i)}
                y={H - 8}
                textAnchor={idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle'}
                className="fill-zinc-400"
                style={{ fontSize: 9 }}
              >
                {formatShortDate(p.date)}
              </text>
            )
          })}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-zinc-900" />
          Bounty in play
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-emerald-500" />
          Earned (hires)
        </span>
      </div>

      {active && (
        <div className="absolute right-0 top-0 z-10 max-h-[260px] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900">
              {formatShortDate(active.date)}
            </span>
            <span className="text-sm font-semibold tabular-nums text-zinc-900">
              {money(active.inPlay)}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[0.6875rem] text-zinc-500">
            <span>
              {active.contributors.length} candidate
              {active.contributors.length === 1 ? '' : 's'} in play
            </span>
            <span className="text-emerald-600">{money(active.earned)} earned</span>
          </div>

          {active.contributors.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-zinc-100 pt-2">
              {active.contributors.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onSelectCandidate?.(c.id)
                    }}
                    className="flex w-full items-baseline justify-between gap-2 rounded px-1 py-0.5 text-left text-[0.6875rem] hover:bg-zinc-50"
                  >
                    <span className="min-w-0 truncate text-zinc-700">
                      {c.name}{' '}
                      <span className="text-zinc-400">({c.company})</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                      {money(c.bounty)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
