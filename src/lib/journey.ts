import { CandidateStatus, CandidateWithRole, FollowUp, StatusEvent } from '@/types'
import {
  GROUP_BY_RANK,
  StageGroup,
  impliesSubmitted,
  isTerminal,
  normalizeStatus,
  statusMeta,
} from './status'
import { daysAgo } from './dates'
import { FollowUpRules, thresholdFor } from './settings'

export interface Journey {
  candidate: CandidateWithRole
  /** All events for this candidate, oldest first. */
  events: StatusEvent[]
  /** When the candidate was sent to the client. null if never submitted. */
  submittedAt: Date | null
  /** When the candidate left the live pipeline (hired or lost). */
  exitAt: Date | null
  /** When the current status was set. Falls back to created_at. */
  since: Date
  /** Days spent in the current status. */
  daysInStatus: number
  /** Furthest funnel group the candidate ever reached. */
  furthest: StageGroup | null
  status: CandidateStatus
  active: boolean
  /** Days allowed in the current stage before chasing. null = never. */
  limit: number | null
  /** Most recent time somebody chased this candidate, if ever. */
  lastFollowUp: FollowUp | null
  /** Days since that chase. null when nobody has chased yet. */
  daysSinceFollowUp: number | null
  /** Sitting in the current status longer than that stage allows. */
  stale: boolean
  bounty: number
}

const asDate = (v: string) => new Date(v)

/**
 * What this candidate is actually worth. Roles carry a baseline bounty
 * computed from the bottom of their salary band; once someone signs at a
 * negotiated salary we recompute from that instead.
 */
export function candidateBounty(candidate: CandidateWithRole) {
  const pct = candidate.role?.bounty_pct
  if (candidate.hired_salary && pct) {
    return Math.round((candidate.hired_salary * pct) / 100)
  }
  return candidate.role?.bounty ?? 0
}

/** The baseline bounty a role's percentage implies. */
export function roleBaselineBounty(salaryMin?: number, pct?: number) {
  if (!salaryMin || !pct) return null
  return Math.round((salaryMin * pct) / 100)
}

export function buildJourney(
  candidate: CandidateWithRole,
  allEvents: StatusEvent[],
  rules?: FollowUpRules,
  allFollowUps: FollowUp[] = []
): Journey {
  const status = normalizeStatus(candidate.status)
  const events = allEvents
    .filter((e) => e.candidate_id === candidate.id)
    .sort((a, b) => asDate(a.occurred_at).getTime() - asDate(b.occurred_at).getTime())

  const submittedEvent = events.find((e) => impliesSubmitted(e.status))
  const submittedAt = submittedEvent
    ? asDate(submittedEvent.occurred_at)
    : impliesSubmitted(status)
      ? asDate(candidate.created_at)
      : null

  const terminalEvent = events.find((e) => isTerminal(e.status))
  const exitAt = terminalEvent
    ? asDate(terminalEvent.occurred_at)
    : isTerminal(status)
      ? asDate(candidate.created_at)
      : null

  // Latest event that matches the candidate's current status wins; otherwise
  // fall back to the most recent event, then to the creation date.
  const lastMatching = [...events].reverse().find((e) => normalizeStatus(e.status) === status)
  const since = asDate(
    lastMatching?.occurred_at ?? events[events.length - 1]?.occurred_at ?? candidate.created_at
  )

  let maxRank = statusMeta(status).rank
  for (const e of events) maxRank = Math.max(maxRank, statusMeta(e.status).rank)
  let furthest: StageGroup | null = GROUP_BY_RANK[maxRank] ?? null
  if (!furthest && submittedAt) furthest = 'submitted'

  const meta = statusMeta(status)
  const daysInStatus = daysAgo(since)
  const limit = thresholdFor(status, rules)

  // Only chases logged during the current stage count — an older one was
  // about a stage the candidate has already left.
  const lastFollowUp =
    allFollowUps
      .filter((f) => f.candidate_id === candidate.id && asDate(f.occurred_at) >= since)
      .sort((a, b) => asDate(b.occurred_at).getTime() - asDate(a.occurred_at).getTime())[0] ?? null

  return {
    candidate,
    events,
    submittedAt,
    exitAt,
    since,
    daysInStatus,
    furthest,
    status,
    active: meta.active,
    limit,
    lastFollowUp,
    daysSinceFollowUp: lastFollowUp ? daysAgo(lastFollowUp.occurred_at) : null,
    stale: meta.active && limit !== null && daysInStatus > limit,
    bounty: candidateBounty(candidate),
  }
}

export function buildJourneys(
  candidates: CandidateWithRole[],
  events: StatusEvent[],
  rules?: FollowUpRules,
  followUps: FollowUp[] = []
): Journey[] {
  const byCandidate = new Map<string, StatusEvent[]>()
  for (const e of events) {
    const list = byCandidate.get(e.candidate_id)
    if (list) list.push(e)
    else byCandidate.set(e.candidate_id, [e])
  }
  const followUpsBy = new Map<string, FollowUp[]>()
  for (const f of followUps) {
    const list = followUpsBy.get(f.candidate_id)
    if (list) list.push(f)
    else followUpsBy.set(f.candidate_id, [f])
  }
  return candidates.map((c) =>
    buildJourney(c, byCandidate.get(c.id) ?? [], rules, followUpsBy.get(c.id) ?? [])
  )
}

/** Candidates whose bounty is in play at a given instant. */
export function inPlayAt(journeys: Journey[], at: Date) {
  return journeys.filter((j) => {
    if (!j.submittedAt || j.submittedAt > at) return false
    if (j.exitAt && j.exitAt <= at) return false
    return true
  })
}

/** Bounty in play at a given instant. */
export function pipelineValueAt(journeys: Journey[], at: Date) {
  return inPlayAt(journeys, at).reduce((sum, j) => sum + j.bounty, 0)
}

/** Bounty from hires closed on or before a given instant. */
export function earnedValueAt(journeys: Journey[], at: Date) {
  let value = 0
  for (const j of journeys) {
    if (j.status !== 'offer_accepted') continue
    const closed = j.exitAt ?? j.since
    if (closed <= at) value += j.bounty
  }
  return value
}
