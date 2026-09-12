import { CandidateStatus } from '@/types'
import { ALL_STATUSES, STATUS_META } from './status'
import { DEFAULT_FOCUS_PERIOD_START, fromDateInput, startOfDay, toDateInput } from './dates'

export const FOLLOW_UP_KEY = 'follow_up_rules'

/**
 * How many days a candidate may sit in a stage before it needs chasing.
 * `null` means never flag that stage. Anything missing falls back to the
 * built-in default for that stage.
 */
export type FollowUpRules = Partial<Record<CandidateStatus, number | null>>

/** Stages worth chasing: the ones a candidate can actually be stuck in. */
export const CONFIGURABLE_STATUSES: CandidateStatus[] = ALL_STATUSES.filter(
  (s) => STATUS_META[s].active
)

export function defaultRules(): FollowUpRules {
  const out: FollowUpRules = {}
  for (const s of CONFIGURABLE_STATUSES) out[s] = STATUS_META[s].staleAfterDays
  return out
}

/** Threshold in effect for a stage, honouring overrides. */
export function thresholdFor(status: CandidateStatus, rules?: FollowUpRules) {
  if (rules && status in rules) return rules[status] ?? null
  return STATUS_META[status].staleAfterDays
}

/** Accepts whatever came back from the settings row and keeps only valid entries. */
export function parseRules(value: unknown): FollowUpRules {
  if (!value || typeof value !== 'object') return {}
  const out: FollowUpRules = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!CONFIGURABLE_STATUSES.includes(key as CandidateStatus)) continue
    if (raw === null) out[key as CandidateStatus] = null
    else if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      out[key as CandidateStatus] = Math.round(raw)
    }
  }
  return out
}

// --- Focus period ------------------------------------------------------------

export const FOCUS_PERIOD_KEY = 'focus_period_start'

/**
 * The settings row stores the date as `yyyy-mm-dd`, read back into a local
 * midnight. Anything unparseable falls back to the built-in default so a bad
 * row can never leave the app without a focus period.
 */
export function parseFocusPeriodStart(value: unknown): Date {
  const raw =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'date' in value
        ? (value as { date: unknown }).date
        : null
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return DEFAULT_FOCUS_PERIOD_START
  }
  const d = fromDateInput(raw)
  return Number.isNaN(d.getTime()) ? DEFAULT_FOCUS_PERIOD_START : startOfDay(d)
}

export function serializeFocusPeriodStart(date: Date) {
  return { date: toDateInput(date) }
}
