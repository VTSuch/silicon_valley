/** Date helpers. Everything works on local-time day boundaries. */

export interface DateRange {
  /** Inclusive start of day. null = no lower bound. */
  from: Date | null
  /** Inclusive end of day. null = no upper bound. */
  to: Date | null
}

export type RangePresetId =
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'focus_period'
  | 'last_3_months'
  | 'all_time'
  | 'custom'

/**
 * Fallback start of the focus period — the stretch of work we care about
 * right now. The live value is a setting (see `lib/settings`), edited on the
 * Settings screen; this is only what applies before it has been loaded.
 */
export const DEFAULT_FOCUS_PERIOD_START = new Date(2026, 6, 1)

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/** Weeks start on Monday. */
export function startOfWeek(d: Date) {
  const s = startOfDay(d)
  const day = (s.getDay() + 6) % 7
  s.setDate(s.getDate() - day)
  return s
}

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

export function addDays(d: Date, n: number) {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export function addMonths(d: Date, n: number) {
  const c = new Date(d)
  c.setMonth(c.getMonth() + n)
  return c
}

export function presetRange(
  id: RangePresetId,
  focusStart: Date = DEFAULT_FOCUS_PERIOD_START,
  now = new Date()
): DateRange {
  switch (id) {
    case 'this_week':
      return { from: startOfWeek(now), to: endOfDay(now) }
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) }
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    case 'focus_period':
      // Open ended: everything from the start of the focus period onwards.
      return { from: startOfDay(focusStart), to: null }
    case 'last_3_months':
      return { from: startOfDay(addMonths(now, -3)), to: endOfDay(now) }
    default:
      return { from: null, to: null }
  }
}

export function inRange(value: string | Date | null | undefined, range: DateRange) {
  if (!value) return false
  const d = typeof value === 'string' ? new Date(value) : value
  if (range.from && d < range.from) return false
  if (range.to && d > range.to) return false
  return true
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

export function daysAgo(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return daysBetween(d, new Date())
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatShortDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function formatMonth(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export function formatFullMonth(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function relativeDays(days: number) {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

/** Past tense, ready to drop into a sentence: "today", "1 day ago", "5 days ago". */
export function relativeAgo(days: number) {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

/** yyyy-mm-dd in local time, for <input type="date"> round-trips. */
export function toDateInput(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInput(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)
}

export function monthKey(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Every month between two dates, inclusive, as first-of-month Dates. */
export function monthsBetween(from: Date, to: Date): Date[] {
  const out: Date[] = []
  const cursor = startOfMonth(from)
  const last = startOfMonth(to)
  while (cursor <= last) {
    out.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

/** Sampled day buckets between two dates (max `maxPoints` samples). */
export function daySeries(from: Date, to: Date, maxPoints = 90): Date[] {
  const total = Math.max(1, daysBetween(from, to))
  const step = Math.max(1, Math.ceil(total / maxPoints))
  const out: Date[] = []
  for (let i = 0; i <= total; i += step) out.push(addDays(startOfDay(from), i))
  const end = startOfDay(to)
  if (out[out.length - 1]?.getTime() !== end.getTime()) out.push(end)
  return out
}

export const endOfWeek = (d: Date) => endOfDay(addDays(startOfWeek(d), 6))

export function addWeeks(d: Date, n: number) {
  return addDays(d, n * 7)
}

export function weekKey(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return `w${toDateInput(startOfWeek(d))}`
}

/** "12 Jan" — the Monday the week starts on. */
export function formatWeek(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return formatShortDate(startOfWeek(d))
}

/** "Week of 12 Jan 2026", for tooltips. */
export function formatFullWeek(value: string | Date) {
  return `Week of ${formatDate(startOfWeek(typeof value === 'string' ? new Date(value) : value))}`
}

// --- Periods: months or weeks, behind one interface -------------------------

export type Granularity = 'month' | 'week'

/** Start of the period a date falls in. */
export function startOfPeriod(value: Date, granularity: Granularity) {
  return granularity === 'month' ? startOfMonth(value) : startOfWeek(value)
}

/** Move `n` periods forward (negative goes back). */
export function addPeriods(value: Date, n: number, granularity: Granularity) {
  return granularity === 'month' ? addMonths(value, n) : addWeeks(value, n)
}

/** Bucket key: two dates share it exactly when they fall in the same period. */
export function periodKey(value: string | Date, granularity: Granularity) {
  return granularity === 'month' ? monthKey(value) : weekKey(value)
}

/** Short axis label. */
export function formatPeriod(value: string | Date, granularity: Granularity) {
  return granularity === 'month' ? formatMonth(value) : formatWeek(value)
}

/** Full label, for tooltips and headers. */
export function formatFullPeriod(value: string | Date, granularity: Granularity) {
  return granularity === 'month' ? formatFullMonth(value) : formatFullWeek(value)
}

/**
 * The `count` periods ending `offset` periods before the one `now` sits in.
 * `offset` 0 ends on the current period, -1 shifts the whole window one step
 * into the past. Oldest first.
 */
export function periodWindow(
  count: number,
  offset: number,
  granularity: Granularity,
  now = new Date()
): Date[] {
  const last = addPeriods(startOfPeriod(now, granularity), offset, granularity)
  const out: Date[] = []
  for (let i = count - 1; i >= 0; i--) out.push(addPeriods(last, -i, granularity))
  return out
}

/** DD/MM/YY — the compact form used on board cards. */
export function formatSlashDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
}

/** "Mon 14 Sep, 20:30" — a call's slot, in the reader's own timezone. */
export function formatSlot(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}
