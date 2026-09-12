'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useJourneys } from '@/hooks/useData'
import { useUI } from '@/context/UIContext'
import DateRangePills, { RangeSelection } from '@/components/common/DateRangePills'
import StageBars, { PeriodBucket, StageLegend } from './StageBars'
import ActivityBars, {
  ACTIVITY_SERIES,
  ActivityBucket,
  ActivityLegend,
} from './ActivityBars'
import CumulativeAreas, { AreaSeries } from './CumulativeAreas'
import PipelineValueChart, { ValuePoint } from './PipelineValueChart'
import EarnedValueChart, { EarnedPoint } from './EarnedValueChart'
import { METRIC_GROUPS, StageGroup, boardColumnFor } from '@/lib/status'
import { inPlaySplitAt, reachedAt } from '@/lib/journey'
import {
  Granularity,
  addPeriods,
  daySeries,
  endOfDay,
  formatPeriod,
  inRange,
  periodKey,
  presetRange,
  startOfPeriod,
} from '@/lib/dates'

/** How many months or weeks the two bar charts show at once. */
const WINDOW = 12

/**
 * The stacked bands of the cumulative view, bottom-first: the earliest stage
 * at the bottom, the furthest on top, so the pile reads like the funnel.
 */
const STAGE_AREAS: AreaSeries[] = [...METRIC_GROUPS]
  .reverse()
  .map((g) => ({ id: g.id, label: g.label, fill: g.fill }))

const ACTIVITY_AREAS: AreaSeries[] = ACTIVITY_SERIES.map((s) => ({
  id: s.id,
  label: s.label,
  fill: s.fill,
}))

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
  /** Month or week buckets, shared by both bar charts. */
  const [granularity, setGranularity] = useState<Granularity>('month')
  /** How many periods back the visible window is scrolled. 0 = up to today. */
  const [offset, setOffset] = useState(0)
  /** Running totals across the window instead of a figure per period. */
  const [cumulative, setCumulative] = useState(false)

  /** Oldest thing on record, so "All time" has a left edge to start from. */
  const earliest = useMemo(() => {
    const times = journeys.map((j) => new Date(j.candidate.created_at).getTime())
    return times.length ? new Date(Math.min(...times)) : new Date()
  }, [journeys])

  /**
   * The visible periods, cut to the selected range: the charts never show a
   * period the filter excludes, and the arrows stop at its edges rather than
   * walking into empty bars. When the range is longer than the window, they
   * scroll through it a period at a time.
   */
  const view = useMemo(() => {
    const first = startOfPeriod(range.range.from ?? earliest, granularity)
    const last = startOfPeriod(range.range.to ?? new Date(), granularity)
    const all: Date[] = []
    for (let d = first; d <= last; d = addPeriods(d, 1, granularity)) all.push(d)
    if (all.length === 0) all.push(last)

    const count = Math.min(WINDOW, all.length)
    // `offset` counts periods back from the end of the range; clamp it so the
    // window always sits fully inside it.
    const end = Math.min(all.length - 1, Math.max(count - 1, all.length - 1 + offset))
    const start = end - count + 1
    return {
      periods: all.slice(start, end + 1),
      canGoBack: start > 0,
      canGoForward: end < all.length - 1,
    }
  }, [range, earliest, granularity, offset])

  const periods = view.periods

  /** Only candidates that actually reached the client, within the range. */
  const cohort = useMemo(
    () =>
      journeys.filter(
        (j) => j.submittedAt && (!range.range.from && !range.range.to ? true : inRange(j.submittedAt, range.range))
      ),
    [journeys, range]
  )

  const buckets = useMemo<PeriodBucket[]>(() => {
    const map = new Map<string, PeriodBucket>()
    for (const start of periods) {
      map.set(periodKey(start, granularity), {
        start,
        label: formatPeriod(start, granularity),
        counts: EMPTY_COUNTS(),
        total: 0,
        rejected: 0,
      })
    }
    for (const j of cohort) {
      const bucket = map.get(periodKey(j.submittedAt as Date, granularity))
      if (!bucket) continue
      const group = j.furthest ?? 'submitted'
      bucket.counts[group] = (bucket.counts[group] ?? 0) + 1
      bucket.total += 1
      // Same rule as the board: a candidate who dropped out after the client
      // had started interviewing them counts as a rejection, not a drop-out.
      if (boardColumnFor(j.status, j.furthestRank) === 'rejected') bucket.rejected += 1
    }
    return [...map.values()]
  }, [cohort, periods, granularity])

  /**
   * Activity, counted when it happened rather than by submission cohort: the
   * invites sent, the calls booked and the CVs sent out in each period.
   */
  const activity = useMemo<ActivityBucket[]>(() => {
    const map = new Map<string, ActivityBucket>()
    for (const start of periods) {
      map.set(periodKey(start, granularity), {
        start,
        label: formatPeriod(start, granularity),
        counts: {},
      })
    }
    for (const j of journeys) {
      for (const series of ACTIVITY_SERIES) {
        const at = reachedAt(j, series.id)
        if (!at) continue
        // A period at the edge of the range is only counted for the days the
        // range actually covers, so the bar matches the filter exactly.
        if ((range.range.from || range.range.to) && !inRange(at, range.range)) continue
        const bucket = map.get(periodKey(at, granularity))
        if (!bucket) continue
        bucket.counts[series.id] = (bucket.counts[series.id] ?? 0) + 1
      }
    }
    return [...map.values()]
  }, [journeys, periods, granularity, range])

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
        <DateRangePills
          value={range}
          onChange={(next) => {
            setRange(next)
            setOffset(0)
          }}
          more={['focus_period', 'last_3_months', 'all_time']}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Submitted" value={totals.submitted} />
        <Tile label="Offers reached" value={totals.offers} />
        <Tile label="Hires" value={totals.hires} />
        <Tile label="Bounty earned" value={`$${totals.hireValue.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Submissions by {granularity}
                </h2>
                <p className="text-xs text-zinc-500">
                  {cumulative
                    ? 'Running totals across this window, stacked by how far those candidates got.'
                    : `Each bar is one submission cohort, split by how far those candidates got.`}
                </p>
              </div>
              <PeriodControls
                granularity={granularity}
                onGranularity={(g) => {
                  setGranularity(g)
                  // Twelve weeks and twelve months are not the same distance
                  // back, so a shared offset would land somewhere arbitrary.
                  setOffset(0)
                }}
                offset={offset}
                onOffset={setOffset}
                cumulative={cumulative}
                onCumulative={setCumulative}
                canGoBack={view.canGoBack}
                canGoForward={view.canGoForward}
              />
            </div>
            <StageLegend />
          </div>
          {cumulative ? (
            <CumulativeAreas
              buckets={buckets}
              series={STAGE_AREAS}
              granularity={granularity}
              emptyLabel="No submissions in this period."
            />
          ) : (
            <StageBars buckets={buckets} granularity={granularity} />
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Activity by {granularity}</h2>
              <p className="text-xs text-zinc-500">
                {cumulative
                  ? 'Running totals across this window, counted on the day each happened.'
                  : `What actually went out in each ${granularity}, counted on the day it happened.`}
              </p>
            </div>
            <ActivityLegend />
          </div>
          {cumulative ? (
            <CumulativeAreas
              buckets={activity}
              series={ACTIVITY_AREAS}
              granularity={granularity}
              emptyLabel="Nothing happened yet."
            />
          ) : (
            <ActivityBars buckets={activity} granularity={granularity} />
          )}
        </section>
      </div>

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

/** Month/week toggle plus the arrows that walk the window one period at a time. */
function PeriodControls({
  granularity,
  onGranularity,
  offset,
  onOffset,
  cumulative,
  onCumulative,
  canGoBack,
  canGoForward,
}: {
  granularity: Granularity
  onGranularity: (g: Granularity) => void
  offset: number
  onOffset: (next: number) => void
  cumulative: boolean
  onCumulative: (next: boolean) => void
  canGoBack: boolean
  canGoForward: boolean
}) {
  const step =
    'flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-30 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500'

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
        {(['month', 'week'] as Granularity[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGranularity(g)}
            className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
              granularity === g ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onCumulative(!cumulative)}
        aria-pressed={cumulative}
        className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
          cumulative
            ? 'border-zinc-900 bg-zinc-900 text-white'
            : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
        }`}
      >
        Cumulative
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onOffset(offset - 1)}
          disabled={!canGoBack}
          className={step}
          title={`Previous ${granularity}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onOffset(Math.min(0, offset + 1))}
          disabled={!canGoForward}
          className={step}
          title={`Next ${granularity}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
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
