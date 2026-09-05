'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  BellRing,
  Briefcase,
  Check,
  CircleDollarSign,
  Handshake,
  Send,
  Settings2,
  Users,
} from 'lucide-react'
import { useJourneys, useRoles } from '@/hooks/useData'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { StatusBadge, SourcePill } from '@/components/common/StatusBadge'
import { relativeAgo, relativeDays } from '@/lib/dates'
import { pipelineOrder, statusMeta } from '@/lib/status'
import { splitLive } from '@/lib/journey'
import FollowUpSettings from './FollowUpSettings'
import RoleSearchCard from './RoleSearchCard'
import NotesCard from './NotesCard'

export default function Dashboard() {
  const journeys = useJourneys()
  const { rolesWithCount } = useRoles()
  const { openCandidate, openRole, setTab } = useUI()
  const { logFollowUp } = useData()
  const [rulesOpen, setRulesOpen] = useState(false)

  // The dashboard is the whole picture; the date filters live on the
  // pipeline and metrics tabs.
  const cohort = journeys

  const stats = useMemo(() => {
    const active = cohort.filter((j) => j.active)
    const submitted = cohort.filter((j) => j.submittedAt)
    const interviewing = cohort.filter((j) =>
      ['first', 'mid', 'final'].includes(statusMeta(j.status).group)
    )
    const offers = cohort.filter((j) => statusMeta(j.status).group === 'offer')
    const hires = cohort.filter((j) => j.status === 'offer_accepted')
    // El pipeline vivo, partido: lo que ya ha pasado la criba del cliente y
    // lo que todavía espera respuesta. No valen lo mismo, y sumarlos en una
    // sola cifra inflaba justo el número que se mira primero.
    const { advanced, submitted: waiting } = splitLive(journeys)

    return {
      active: active.length,
      submitted: submitted.length,
      interviewing: interviewing.length,
      offers: offers.length,
      hires: hires.length,
      hireValue: hires.reduce((s, j) => s + j.bounty, 0),
      liveValue: advanced.reduce((s, j) => s + j.bounty, 0),
      liveWaitingValue: waiting.reduce((s, j) => s + j.bounty, 0),
      liveCount: advanced.length + waiting.length,
    }
  }, [cohort, journeys])

  const alerts = useMemo(
    () =>
      journeys
        .filter((j) => j.stale && j.status !== 'needs_role')
        .sort((a, b) => {
          // Already chased drops to the bottom, then most overdue first.
          const chased = (x: typeof a) => (x.daysSinceFollowUp === null ? -1 : x.daysSinceFollowUp)
          if ((chased(a) >= 0) !== (chased(b) >= 0)) return chased(a) >= 0 ? 1 : -1
          if (chased(a) >= 0 && chased(b) >= 0) return chased(b) - chased(a)
          const overdue = (x: typeof a) => x.daysInStatus - (x.limit ?? 0)
          return overdue(b) - overdue(a)
        }),
    [journeys]
  )

  const activeList = useMemo(
    () =>
      cohort
        .filter((j) => j.active && j.status !== 'needs_role')
        // Furthest along first: the reverse of the pipeline order, so Offer
        // extended sits on top and Calendly sent at the bottom.
        .sort(
          (a, b) => pipelineOrder(b.status) - pipelineOrder(a.status) || b.bounty - a.bounty
        ),
    [cohort]
  )

  const topRoles = useMemo(
    () => [...rolesWithCount].sort((a, b) => b.candidateCount - a.candidateCount).slice(0, 8),
    [rolesWithCount]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500">Everything that needs your attention today.</p>
        </div>
      </div>

      {/* KPIs ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi
          label="Live pipeline"
          value={
            <>
              <span className="text-emerald-600">${stats.liveValue.toLocaleString()}</span>
              {stats.liveWaitingValue > 0 && (
                <span className="ml-1.5 text-base font-semibold text-zinc-900">
                  (+${stats.liveWaitingValue.toLocaleString()})
                </span>
              )}
            </>
          }
          sub={`${stats.liveCount} candidates in play`}
          icon={CircleDollarSign}
          highlight
        />
        <Kpi label="Submitted" value={stats.submitted} icon={Send} />
        <Kpi label="Interviewing" value={stats.interviewing} icon={Users} />
        <Kpi label="Offers out" value={stats.offers} icon={Handshake} />
        <Kpi
          label="Hires"
          value={
            <>
              {stats.hires}
              {stats.hireValue > 0 && (
                <span className="ml-1.5 text-base font-semibold text-emerald-600">
                  (+${stats.hireValue.toLocaleString()})
                </span>
              )}
            </>
          }
          icon={Briefcase}
        />
        <Kpi label="Needs follow-up" value={alerts.length} icon={Bell} warn={alerts.length > 0} />
      </div>

      {/* Follow-ups, the live pipeline and the scratchpad, side by side. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[70fr_99fr_51fr]">
        {/* Follow-ups ------------------------------------------------------- */}
        <section className="rounded-xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Bell className="h-4 w-4 text-amber-500" />
              Follow-ups
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">{alerts.length} stalled</span>
              <button
                onClick={() => setRulesOpen(true)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                title="Configure follow-up rules"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </header>
          <div className="max-h-[420px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-400">
                Nothing is stalling. Nice.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {alerts.map((j) => {
                  const limit = j.limit ?? 0
                  const chased = j.daysSinceFollowUp !== null
                  return (
                    <li key={j.candidate.id} className={chased ? 'bg-zinc-50/60' : ''}>
                      <div className="flex items-center gap-2 px-4 py-3">
                        <button
                          onClick={() => openCandidate(j.candidate.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 truncate text-sm font-medium text-zinc-900">
                              {j.candidate.full_name}
                            </span>
                            <StatusBadge status={j.status} className="shrink-0" />
                          </span>
                          <span className="block truncate text-xs text-zinc-400">
                            {j.candidate.role?.company}
                          </span>
                          {chased && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-emerald-700">
                              <Check className="h-3 w-3" />
                              Followed up {relativeAgo(j.daysSinceFollowUp as number)}
                              {j.lastFollowUp?.author ? ` · ${j.lastFollowUp.author}` : ''}
                            </span>
                          )}
                        </button>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              chased ? 'bg-zinc-100 text-zinc-500' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {relativeDays(j.daysInStatus)}
                            <span className="opacity-60"> / {limit}d</span>
                          </span>
                          <button
                            onClick={() => logFollowUp(j.candidate.id, new Date())}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
                            title="Log that you chased this candidate today"
                          >
                            <BellRing className="h-3 w-3" />
                            {chased ? 'Chased again' : 'Mark chased'}
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Active pipeline --------------------------------------------------- */}
        <section className="rounded-xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">
              Active candidates{' '}
              <span className="font-normal text-zinc-400">({activeList.length})</span>
            </h2>
            <button
              onClick={() => setTab('pipeline')}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              Open board <ArrowRight className="h-3 w-3" />
            </button>
          </header>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-zinc-100">
                {activeList.map((j) => (
                  <tr
                    key={j.candidate.id}
                    onClick={() => openCandidate(j.candidate.id)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-zinc-900">{j.candidate.full_name}</div>
                      <div className="text-xs text-zinc-400">
                        {j.candidate.role?.job_title} · {j.candidate.role?.company}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">
                      {relativeDays(j.daysInStatus)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
                      {j.bounty ? `$${j.bounty.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
                {activeList.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm text-zinc-400">
                      No active candidates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <NotesCard />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[70fr_150fr]">
        <RoleSearchCard journeys={journeys} />

        {/* Roles ------------------------------------------------------------ */}
        <section className="rounded-xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Roles</h2>
            <button
              onClick={() => setTab('roles')}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              See all <ArrowRight className="h-3 w-3" />
            </button>
          </header>
          <div className="max-h-[420px] grid grid-cols-1 gap-px overflow-y-auto bg-zinc-100 sm:grid-cols-2">
            {topRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => openRole(role.id)}
                className="bg-white p-4 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {role.job_title}
                    </div>
                    <div className="truncate text-xs text-zinc-400">{role.company}</div>
                  </div>
                  <SourcePill source={role.source} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {role.candidateCount} candidate{role.candidateCount === 1 ? '' : 's'}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-900">
                    {role.bounty ? `$${role.bounty.toLocaleString()}` : '—'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <FollowUpSettings open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  subClassName = 'text-zinc-400',
  icon: Icon,
  highlight,
  warn,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  subClassName?: string
  icon: React.ElementType
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        highlight ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200'
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon className={`h-3.5 w-3.5 ${warn ? 'text-amber-500' : 'text-zinc-400'}`} />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900">{value}</div>
      {sub && <div className={`mt-0.5 truncate text-xs ${subClassName}`}>{sub}</div>}
    </div>
  )
}
