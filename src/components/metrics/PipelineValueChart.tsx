'use client'

import { useMemo, useState } from 'react'
import { formatShortDate } from '@/lib/dates'

export interface Contributor {
  id: string
  name: string
  company: string
  bounty: number
  /** Still waiting on the client's first answer on that date. */
  waiting: boolean
}

export interface ValuePoint {
  date: Date
  /** Bounty past the client's screen: first stage onwards. */
  advanced: number
  /** Bounty submitted and still waiting for an answer. Stacks on `advanced`. */
  waiting: number
  /** Who makes up the two bands on that date, biggest bounty first. */
  contributors: Contributor[]
}

const W = 800
const H = 220
const PAD = { top: 12, right: 8, bottom: 24, left: 52 }

/* Azul del badge de «Submitted»: la banda de arriba y su etiqueta son la
   misma cosa vista en dos sitios, y conviene que se reconozca. */
const AZUL = '#2563eb'

/**
 * Bounty at risk over time: it rises when a candidate is submitted and drops
 * when they are rejected or hired. Lo ya cobrado vive en su propia gráfica.
 *
 * Van dos bandas apiladas, no una. Abajo lo que ya pasó la criba del cliente;
 * encima, sumado, lo que sigue esperando respuesta. Una sola curva daba el
 * mismo peso a un CV recién mandado que a alguien en ronda final, y escondía
 * el día en que uno pasa de lo segundo a lo primero: el total no se mueve,
 * pero la frontera entre bandas sube. La discontinua de arriba avisa de que
 * esa parte todavía puede caerse entera.
 */
export default function PipelineValueChart({
  points,
  onSelectCandidate,
}: {
  points: ValuePoint[]
  onSelectCandidate?: (id: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)

  const { advancedPath, advancedArea, totalPath, waitingBand, max, x, y, total } =
    useMemo(() => {
      const total = (p: ValuePoint) => p.advanced + p.waiting
      const max = Math.max(1, ...points.map(total))
      const innerW = W - PAD.left - PAD.right
      const innerH = H - PAD.top - PAD.bottom
      const x = (i: number) =>
        PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW)
      const y = (v: number) => PAD.top + innerH - (v / max) * innerH

      const line = (value: (p: ValuePoint) => number) =>
        points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(value(p)).toFixed(1)}`)
          .join(' ')

      const advancedPath = line((p) => p.advanced)
      const totalPath = line(total)
      const advancedArea = points.length
        ? `${advancedPath} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
        : ''
      // La banda de espera se cierra volviendo por encima de la de abajo, así
      // que solo pinta la diferencia entre las dos y no tapa a la primera.
      const vuelta = points
        .map((p, i) => `L${x(i).toFixed(1)},${y(p.advanced).toFixed(1)}`)
        .reverse()
        .join(' ')
      const waitingBand = points.length ? `${totalPath} ${vuelta} Z` : ''

      return {
        advancedPath,
        advancedArea,
        totalPath,
        waitingBand,
        max,
        x,
        y,
        total,
      }
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

        <path d={advancedArea} fill="#18181b" opacity={0.06} />
        <path d={waitingBand} fill={AZUL} opacity={0.12} />
        <path
          d={advancedPath}
          fill="none"
          stroke="#18181b"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={totalPath}
          fill="none"
          stroke={AZUL}
          strokeWidth={1.5}
          strokeDasharray="5 3"
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
            <circle cx={x(hover)} cy={y(points[hover].advanced)} r={3.5} fill="#18181b" />
            {points[hover].waiting > 0 && (
              <circle cx={x(hover)} cy={y(total(points[hover]))} r={3.5} fill={AZUL} />
            )}
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
          Past first stage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: AZUL }} />
          Submitted, waiting
        </span>
      </div>

      {active && (
        <div className="absolute right-0 top-0 z-10 max-h-[260px] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900">
              {formatShortDate(active.date)}
            </span>
            <span className="text-sm font-semibold tabular-nums text-zinc-900">
              {money(active.advanced)}
              {active.waiting > 0 && (
                <span className="ml-1 text-xs" style={{ color: AZUL }}>
                  (+{money(active.waiting)})
                </span>
              )}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[0.6875rem] text-zinc-500">
            <span>
              {active.contributors.length} candidate
              {active.contributors.length === 1 ? '' : 's'} in play
            </span>
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
                    <span
                      className="shrink-0 font-medium tabular-nums"
                      style={{ color: c.waiting ? AZUL : '#18181b' }}
                    >
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
