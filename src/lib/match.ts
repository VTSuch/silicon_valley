/**
 * Matching a Calendly booking to a candidate.
 *
 * The name does the work here, not the email: plenty of candidates book a
 * call before we have their address on file, and some book with a different
 * one. So the email is only ever a confirmation when it happens to line up,
 * never a requirement.
 *
 * What makes fuzzy name matching safe is the pool. At any moment the people
 * who might plausibly book are the handful we have just sent a link to, so a
 * decent match among those beats a better-looking one against someone who
 * was hired months ago.
 */

import { CandidateWithRole } from '@/types'
import { normalizeStatus, statusMeta } from './status'

export type MatchKind = 'email' | 'name' | 'suggested' | 'manual' | 'none'

export interface MatchResult {
  candidate: CandidateWithRole | null
  kind: MatchKind
  /** 0–1, how close the winning name was. 1 when the email settled it. */
  score: number
}

/** Lowercase, accents stripped, punctuation gone, single spaces. */
export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Honorifics and suffixes carry no identity and only get in the way. */
const NOISE = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'jr', 'sr', 'ii', 'iii', 'iv'])

export function nameTokens(value: string) {
  return normalizeName(value)
    .split(' ')
    .filter((t) => t && !NOISE.has(t))
}

/** Jaro–Winkler, for the typo case: "Clawson" against "Lawson". */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aFlags = new Array<boolean>(a.length).fill(false)
  const bFlags = new Array<boolean>(b.length).fill(false)
  let matches = 0

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window)
    const end = Math.min(i + window + 1, b.length)
    for (let j = start; j < end; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue
      aFlags[i] = true
      bFlags[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue
    while (!bFlags[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  transpositions /= 2

  const m = matches
  const jaro = (m / a.length + m / b.length + (m - transpositions) / m) / 3

  let prefix = 0
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  return jaro + prefix * 0.1 * (1 - jaro)
}

/**
 * How alike two names are, 0–1, down a ladder of increasingly loose rules.
 * Each rung is a real way the same person gets written down two ways.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = nameTokens(a)
  const right = nameTokens(b)
  if (!left.length || !right.length) return 0

  const leftName = left.join(' ')
  const rightName = right.join(' ')
  if (leftName === rightName) return 1

  // Same tokens in any order, middle names ignored: "Groome, Jarod A."
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const [small, big] = left.length <= right.length ? [leftSet, rightSet] : [rightSet, leftSet]
  if (small.size > 1 && [...small].every((t) => big.has(t))) return 0.95

  const firstLast = (t: string[]) => [t[0], t[t.length - 1]] as const
  const [lf, ll] = firstLast(left)
  const [rf, rl] = firstLast(right)

  if (lf === rf && ll === rl) return 0.9
  // Surname plus an initial: "J. Groome".
  if (ll === rl && lf[0] === rf[0] && (lf.length === 1 || rf.length === 1)) return 0.85

  // A typo somewhere. Only trust it when the surnames are close too, so
  // "John Smith" and "John Smyth" pass but "John Smith" and "John Brown" do not.
  const whole = jaroWinkler(leftName, rightName)
  const surname = jaroWinkler(ll, rl)
  if (whole >= 0.88 && surname >= 0.85) return 0.7 + (whole - 0.88) * 1.5

  return 0
}

/**
 * Candidates we are actually waiting on rank first. Someone we just sent a
 * Calendly link to is the likeliest person to appear in the calendar; someone
 * already hired or rejected is the unlikeliest.
 */
function tierBonus(candidate: CandidateWithRole) {
  const status = normalizeStatus(candidate.status)
  if (status === 'calendly_sent') return 0.12
  return statusMeta(status).active ? 0.04 : 0
}

/** Confident enough to link and to move the candidate on by itself. */
const CONFIDENT = 0.9
/** Worth showing as a suggestion, but a person should confirm it. */
const SUGGEST = 0.75
/** Below this gap the runner-up is too close to call. */
const MARGIN = 0.08

export function matchBooking(
  booking: { inviteeName: string; inviteeEmail: string | null },
  candidates: CandidateWithRole[]
): MatchResult {
  const email = booking.inviteeEmail?.trim().toLowerCase()
  if (email) {
    const exact = candidates.find((c) => c.email?.trim().toLowerCase() === email)
    if (exact) return { candidate: exact, kind: 'email', score: 1 }
  }

  const scored = candidates
    .map((candidate) => ({
      candidate,
      raw: nameSimilarity(booking.inviteeName, candidate.full_name),
      bonus: tierBonus(candidate),
    }))
    .filter((s) => s.raw > 0)
    .map((s) => ({ ...s, total: s.raw + s.bonus }))
    .sort((a, b) => b.total - a.total)

  const best = scored[0]
  if (!best) return { candidate: null, kind: 'none', score: 0 }

  const runnerUp = scored[1]
  // Two people this close cannot be told apart from a name. Ask instead of
  // guessing: linking the wrong candidate is worse than linking none.
  const ambiguous = !!runnerUp && best.total - runnerUp.total < MARGIN

  if (best.raw >= CONFIDENT && !ambiguous) {
    return { candidate: best.candidate, kind: 'name', score: best.raw }
  }
  if (best.total >= SUGGEST) {
    return { candidate: best.candidate, kind: 'suggested', score: best.raw }
  }
  return { candidate: null, kind: 'none', score: best.raw }
}
