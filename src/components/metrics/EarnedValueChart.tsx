'use client'

import { useMemo, useState } from 'react'
import { formatShortDate } from '@/lib/dates'

export interface EarnedHire {
  id: string
  name: string
  company: string
  bounty: number
  closedAt: Date
}

export interface EarnedPoint {
  date: Date
  /** Cumulative bounty from hires closed on or before that date. */
  earned: number
  /** Every hire counted in `earned`, most recent first. */
  hires: EarnedHire[]
}

const W = 800
const H = 160
const PAD = { top: 12, right: 8, bottom: 24, left: 52 }

const VERDE = '#10b981'

/**
 * Lo cobrado, en su propia gráfica.
 *
 * Vivía encima de la del pipeline, y ahí no se leía: son dos magnitudes con
 * escalas distintas —lo que está en juego sube y baja, lo cobrado solo sube—
 * y compartir eje aplastaba la que fuera menor de las dos contra el suelo.
 * Separadas, cada una usa su alto entero.
 */
export default function EarnedValueChart({
  points,
  onSelectCandidate,
}: {
  points: EarnedPoint[]
  onSelectCandidate?: (id: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)

  const { linePath, areaPath, max, x, y } = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => p.earned))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.earned).toFixed(1)}`)
      .join(' ')
    const areaPath = points.length
      ? `${linePath} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
      : ''

    return { linePath, areaPath, max, x, y }
  }, [points])

  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-400">Not enough history yet.</p>
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
        {[0, 0.5, 1].map((f) => (
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

        <path d={areaPath} fill={VERDE} opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke={VERDE}
          strokeWidth={2}
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
            <circle cx={x(hover)} cy={y(points[hover].earned)} r={3.5} fill={VERDE} />
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

      {active && (
        <div className="absolute right-0 top-0 z-10 max-h-[220px] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900">
              {formatShortDate(active.date)}
            </span>
            <span className="text-sm font-semibold tabular-nums text-emerald-600">
              {money(active.earned)}
            </span>
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-zinc-500">
            {active.hires.length} hire{active.hires.length === 1 ? '' : 's'} closed
          </div>

          {active.hires.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-zinc-100 pt-2">
              {active.hires.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onSelectCandidate?.(h.id)
                    }}
                    className="flex w-full items-baseline justify-between gap-2 rounded px-1 py-0.5 text-left text-[0.6875rem] hover:bg-zinc-50"
                  >
                    <span className="min-w-0 truncate text-zinc-700">
                      {h.name} <span className="text-zinc-400">({h.company})</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                      {money(h.bounty)}
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
