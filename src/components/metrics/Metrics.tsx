'use client'

import { useMemo, useState } from 'react'
import { useJourneys } from '@/hooks/useData'
import { useUI } from '@/context/UIContext'
import DateRangePills, { RangeSelection } from '@/components/common/DateRangePills'
import StageBars, { MonthBucket, StageLegend } from './StageBars'
import PipelineValueChart, { ValuePoint } from './PipelineValueChart'
import EarnedValueChart, { EarnedPoint } from './EarnedValueChart'
import { METRIC_GROUPS, StageGroup } from '@/lib/status'
import { inPlaySplitAt } from '@/lib/journey'
import {
  daySeries,
  endOfDay,
  formatMonth,
  inRange,
  monthKey,
  monthsBetween,
  presetRange,
} from '@/lib/dates'

const EMPTY_COUNTS = (): Record<StageGroup, number> => ({
  lead: 0,
  submitted: 0,
  first: 0,
  mid: 0,
  final: 0,
  offer: 0,
  hired: 0,
  lost: 0,
})

export default function Metrics() {
  const journeys = useJourneys()
  const { openCandidate } = useUI()
  const [range, setRange] = useState<RangeSelection>({
    preset: 'this_year',
    range: presetRange('this_year'),
  })

  /** Only candidates that actually reached the client, within the range. */
  const cohort = useMemo(
    () =>
      journeys.filter(
        (j) => j.submittedAt && (!range.range.from && !range.range.to ? true : inRange(j.submittedAt, range.range))
      ),
    [journeys, range]
  )

  const buckets = useMemo<MonthBucket[]>(() => {
    if (cohort.length === 0) return []
    const dates = cohort.map((j) => j.submittedAt as Date)
    const first = new Date(Math.min(...dates.map((d) => d.getTime())))
    const last = new Date(Math.max(...dates.map((d) => d.getTime())))

    const map = new Map<string, MonthBucket>()
    for (const month of monthsBetween(first, last)) {
      map.set(monthKey(month), {
        month,
        label: formatMonth(month),
        counts: EMPTY_COUNTS(),
        total: 0,
      })
    }
    for (const j of cohort) {
      const bucket = map.get(monthKey(j.submittedAt as Date))
      if (!bucket) continue
      const group = j.furthest ?? 'submitted'
      bucket.counts[group] = (bucket.counts[group] ?? 0) + 1
      bucket.total += 1
    }
    return [...map.values()]
  }, [cohort])

  /** Conversion: share of the cohort that reached each stage or beyond. */
  const rates = useMemo(() => {
    const total = cohort.length
    const order: StageGroup[] = ['submitted', 'first', 'mid', 'final', 'offer', 'hired']
    const rank = (g: StageGroup) => order.indexOf(g)

    const reached = (g: StageGroup) =>
      cohort.filter((j) => rank(j.furthest ?? 'submitted') >= rank(g)).length

    return {
      total,
      rows: METRIC_GROUPS.filter((g) => g.id !== 'submitted')
        .slice()
        .reverse()
        .map((g) => {
          const count = reached(g.id)
          return {
            id: g.id,
            label: g.label,
            fill: g.fill,
            count,
            pct: total ? Math.round((count / total) * 100) : 0,
          }
        }),
      notInterviewed: total ? Math.round(((total - reached('first')) / total) * 100) : 0,
    }
  }, [cohort])

  const valuePoints = useMemo<ValuePoint[]>(() => {
    const submitted = journeys.filter((j) => j.submittedAt)
    if (submitted.length === 0) return []
    const from =
      range.range.from ??
      new Date(Math.min(...submitted.map((j) => (j.submittedAt as Date).getTime())))
    const to = range.range.to ?? new Date()
    return daySeries(from, to).map((date) => {
      const at = endOfDay(date)
      // El reparto se recalcula día a día contra el historial de estados: el
      // día que alguien pasa de entregado a primera ronda, su bounty cambia de
      // banda sin que el total se mueva.
      const { advanced, submitted } = inPlaySplitAt(journeys, at)
      const suma = (list: typeof advanced) => list.reduce((sum, j) => sum + j.bounty, 0)
      return {
        date,
        advanced: suma(advanced),
        waiting: suma(submitted),
        contributors: [
          ...advanced.map((j) => ({ j, waiting: false })),
          ...submitted.map((j) => ({ j, waiting: true })),
        ]
          .sort((a, b) => b.j.bounty - a.j.bounty)
          .map(({ j, waiting }) => ({
            id: j.candidate.id,
            name: j.candidate.full_name.trim(),
            company: j.candidate.role?.company ?? '—',
            bounty: j.bounty,
            waiting,
          })),
      }
    })
  }, [journeys, range])

  /**
   * Lo cobrado, acumulado. Va aparte de `valuePoints` porque ahora son dos
   * gráficas: comparten fechas pero no eje, y mezclarlas aplastaba la pequeña.
   */
  const earnedPoints = useMemo<EarnedPoint[]>(() => {
    const hires = journeys
      .filter((j) => j.status === 'offer_accepted')
      .map((j) => ({
        id: j.candidate.id,
        name: j.candidate.full_name.trim(),
        company: j.candidate.role?.company ?? '—',
        bounty: j.bounty,
        closedAt: j.exitAt ?? j.since,
      }))
    if (hires.length === 0) return []
    const from =
      range.range.from ?? new Date(Math.min(...hires.map((h) => h.closedAt.getTime())))
    const to = range.range.to ?? new Date()
    return daySeries(from, to).map((date) => {
      const at = endOfDay(date)
      const cerradas = hires
        .filter((h) => h.closedAt <= at)
        .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime())
      return {
        date,
        earned: cerradas.reduce((sum, h) => sum + h.bounty, 0),
        hires: cerradas,
      }
    })
  }, [journeys, range])

  const totals = useMemo(() => {
    const hires = cohort.filter((j) => j.furthest === 'hired')
    const offers = cohort.filter((j) => (j.furthest === 'offer' || j.furthest === 'hired'))
    return {
      submitted: cohort.length,
      hires: hires.length,
      hireValue: hires.reduce((s, j) => s + j.bounty, 0),
      offers: offers.length,
      submittedValue: cohort.reduce((s, j) => s + j.bounty, 0),
    }
  }, [cohort])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Metrics</h1>
          <p className="text-sm text-zinc-500">
            Candidates count in the month they were submitted, whatever happens later.
          </p>
        </div>
        <DateRangePills value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Submitted" value={totals.submitted} />
        <Tile label="Offers reached" value={totals.offers} />
        <Tile label="Hires" value={totals.hires} />
        <Tile label="Bounty earned" value={`$${totals.hireValue.toLocaleString()}`} />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Submissions by month</h2>
            <p className="text-xs text-zinc-500">
              Each bar is one submission cohort, split by how far those candidates got.
            </p>
          </div>
          <StageLegend />
        </div>
        <StageBars buckets={buckets} />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-zinc-900">Conversion</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Share of the {rates.total} submitted candidates that reached each stage.
          </p>
          <ul className="space-y-3">
            {rates.rows.map((r) => (
              <li key={r.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.fill }} />
                    {r.label}
                  </span>
                  <span className="tabular-nums font-medium text-zinc-900">
                    {r.pct}% <span className="font-normal text-zinc-400">({r.count})</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, backgroundColor: r.fill }}
                  />
                </div>
              </li>
            ))}
            <li className="border-t border-zinc-100 pt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Never interviewed
                </span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {rates.notInterviewed}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-red-400"
                  style={{ width: `${rates.notInterviewed}%` }}
                />
              </div>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Pipeline value over time</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Solid band: past first stage. Dashed band on top: submitted and still waiting.
          </p>
          <PipelineValueChart points={valuePoints} onSelectCandidate={openCandidate} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Earned from hires</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Cumulative bounty from candidates who signed. Only goes up.
          </p>
          <EarnedValueChart points={earnedPoints} onSelectCandidate={openCandidate} />
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</div>
    </div>
  )
}
