import { CandidateStatus } from '@/types'

/**
 * Single source of truth for everything status-related: order, labels,
 * colours, which stage group a status belongs to, and how long a candidate
 * may sit in it before it counts as stale.
 */

export type StageGroup =
  | 'lead'
  | 'submitted'
  | 'first'
  | 'mid'
  | 'final'
  | 'offer'
  | 'hired'
  | 'lost'

export interface StatusMeta {
  id: CandidateStatus
  label: string
  short: string
  group: StageGroup
  /** Position in the funnel. Higher = further along. Lost statuses keep -1. */
  rank: number
  /** Candidate is still in play (counts toward pipeline value and alerts). */
  active: boolean
  /** Days allowed in this status before we flag it. null = never flag. */
  staleAfterDays: number | null
  dot: string
  badge: string
  column: string
}

export const STATUS_META: Record<CandidateStatus, StatusMeta> = {
  to_be_called: {
    id: 'to_be_called', label: 'To be called', short: 'To call', group: 'lead', rank: 0,
    active: true, staleAfterDays: 3,
    dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', column: 'bg-sky-500',
  },
  standby: {
    id: 'standby', label: 'Standby', short: 'Standby', group: 'lead', rank: 0,
    active: true, staleAfterDays: 21,
    dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 ring-slate-500/20', column: 'bg-slate-400',
  },
  submitted: {
    id: 'submitted', label: 'Submitted', short: 'Submitted', group: 'submitted', rank: 1,
    active: true, staleAfterDays: 7,
    dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', column: 'bg-blue-500',
  },
  first_interview: {
    id: 'first_interview', label: 'First stage', short: 'First', group: 'first', rank: 2,
    active: true, staleAfterDays: 7,
    dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', column: 'bg-violet-500',
  },
  second_interview: {
    id: 'second_interview', label: 'Mid stage 1', short: 'Mid 1', group: 'mid', rank: 3,
    active: true, staleAfterDays: 7,
    dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', column: 'bg-amber-500',
  },
  third_interview: {
    id: 'third_interview', label: 'Mid stage 2', short: 'Mid 2', group: 'mid', rank: 4,
    active: true, staleAfterDays: 7,
    dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', column: 'bg-amber-500',
  },
  fourth_interview: {
    id: 'fourth_interview', label: 'Mid stage 3', short: 'Mid 3', group: 'mid', rank: 5,
    active: true, staleAfterDays: 7,
    dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', column: 'bg-amber-500',
  },
  final_interview: {
    id: 'final_interview', label: 'Final stage', short: 'Final', group: 'final', rank: 6,
    active: true, staleAfterDays: 5,
    dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', column: 'bg-orange-500',
  },
  offer: {
    id: 'offer', label: 'Offer extended', short: 'Offer', group: 'offer', rank: 7,
    active: true, staleAfterDays: 4,
    dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', column: 'bg-rose-500',
  },
  offer_accepted: {
    id: 'offer_accepted', label: 'Hired', short: 'Hired', group: 'hired', rank: 8,
    active: false, staleAfterDays: null,
    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', column: 'bg-emerald-500',
  },
  offer_rejected: {
    id: 'offer_rejected', label: 'Offer rejected', short: 'Offer rej.', group: 'lost', rank: -1,
    active: false, staleAfterDays: null,
    dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-600/20', column: 'bg-red-400',
  },
  cv_rejected: {
    id: 'cv_rejected', label: 'Submission rejected', short: 'Sub. rej.', group: 'lost', rank: -1,
    active: false, staleAfterDays: null,
    dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-600/20', column: 'bg-red-400',
  },
  client_rejected: {
    id: 'client_rejected', label: 'Rejected in stages', short: 'Rejected', group: 'lost', rank: -1,
    active: false, staleAfterDays: null,
    dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-600/20', column: 'bg-red-400',
  },
  candidate_quit: {
    id: 'candidate_quit', label: 'Candidate dropped', short: 'Dropped', group: 'lost', rank: -1,
    active: false, staleAfterDays: null,
    dot: 'bg-stone-500', badge: 'bg-stone-100 text-stone-700 ring-stone-500/20', column: 'bg-stone-400',
  },
}

/** Funnel order, used by the pipeline board and every status picker. */
export const PIPELINE_STATUSES: CandidateStatus[] = [
  'to_be_called',
  'submitted',
  'first_interview',
  'second_interview',
  'third_interview',
  'fourth_interview',
  'final_interview',
  'offer',
  'offer_accepted',
]

/** The mid-stage ladder, in order. The board shows them as a single column. */
export const MID_STATUSES: CandidateStatus[] = [
  'second_interview',
  'third_interview',
  'fourth_interview',
]

/**
 * Board columns. Mid stages collapse into one column so the board stays
 * readable; the individual mid steps live in the candidate panel.
 */
export interface BoardColumn {
  id: string
  label: string
  statuses: CandidateStatus[]
  /** Status applied when a card is dropped into this column. */
  entry: CandidateStatus
  color: string
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: 'to_be_called', label: 'To be called', statuses: ['to_be_called'], entry: 'to_be_called', color: 'bg-sky-500' },
  { id: 'submitted', label: 'Submitted', statuses: ['submitted'], entry: 'submitted', color: 'bg-blue-500' },
  { id: 'first', label: 'First stage', statuses: ['first_interview'], entry: 'first_interview', color: 'bg-violet-500' },
  { id: 'mid', label: 'Mid stage', statuses: MID_STATUSES, entry: 'second_interview', color: 'bg-amber-500' },
  { id: 'final', label: 'Final stage', statuses: ['final_interview'], entry: 'final_interview', color: 'bg-orange-500' },
  { id: 'offer', label: 'Offer extended', statuses: ['offer'], entry: 'offer', color: 'bg-rose-500' },
  { id: 'hired', label: 'Hired', statuses: ['offer_accepted'], entry: 'offer_accepted', color: 'bg-emerald-500' },
]

/** Which mid step a status is, 1-based. 0 when it is not a mid stage. */
export function midStep(status: string): number {
  return MID_STATUSES.indexOf(normalizeStatus(status)) + 1
}

export const CLOSED_STATUSES: CandidateStatus[] = [
  'standby',
  'cv_rejected',
  'client_rejected',
  'offer_rejected',
  'candidate_quit',
]

export const ALL_STATUSES: CandidateStatus[] = [...PIPELINE_STATUSES, ...CLOSED_STATUSES]

/** Legacy rows in the database predate the current enum. */
const LEGACY: Record<string, CandidateStatus> = {
  sent_to_agency: 'submitted',
  sent_to_client: 'submitted',
}

export function normalizeStatus(status: string): CandidateStatus {
  if (status in LEGACY) return LEGACY[status]
  if (status in STATUS_META) return status as CandidateStatus
  return 'standby'
}

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[normalizeStatus(status)]
}

export function statusLabel(status: string): string {
  return statusMeta(status).label
}

export function isActive(status: string): boolean {
  return statusMeta(status).active
}

/**
 * True once the candidate has been sent to the client. Every status except
 * the two pre-submission ones implies a submission happened — a CV rejection
 * can only follow one.
 */
export function impliesSubmitted(status: string): boolean {
  return statusMeta(status).group !== 'lead'
}

/** Terminal outcomes: the candidate has left the live pipeline. */
export function isTerminal(status: string): boolean {
  const g = statusMeta(status).group
  return g === 'lost' || g === 'hired'
}

// --- Stage groups, used by the metrics tab -----------------------------------

export const METRIC_GROUPS: { id: StageGroup; label: string; fill: string; dot: string }[] = [
  { id: 'hired', label: 'Hired', fill: '#10b981', dot: 'bg-emerald-500' },
  { id: 'offer', label: 'Offer', fill: '#f43f5e', dot: 'bg-rose-500' },
  { id: 'final', label: 'Final stage', fill: '#f97316', dot: 'bg-orange-500' },
  { id: 'mid', label: 'Mid stage', fill: '#f59e0b', dot: 'bg-amber-500' },
  { id: 'first', label: 'First stage', fill: '#8b5cf6', dot: 'bg-violet-500' },
  { id: 'submitted', label: 'Submitted', fill: '#3b82f6', dot: 'bg-blue-500' },
]

/** Ordered ranks a candidate passes through, used to derive "furthest reached". */
export const GROUP_BY_RANK: Record<number, StageGroup> = {
  1: 'submitted',
  2: 'first',
  3: 'mid',
  4: 'mid',
  5: 'mid',
  6: 'final',
  7: 'offer',
  8: 'hired',
}
