import { Prospect, ProspectStatus } from '@/types'
import { addDays, startOfDay, startOfWeek } from './dates'

// --- Statuses ---------------------------------------------------------------

export const PROSPECT_STATUSES: ProspectStatus[] = [
  'pending',
  'sent',
  'accepted',
  'replied',
  'interested',
  'declined',
  'skipped',
  'rejected',
]

export const PROSPECT_LABEL: Record<ProspectStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  accepted: 'Accepted',
  replied: 'Replied',
  interested: 'Interested',
  declined: 'Not interested',
  skipped: 'Skipped',
  rejected: 'Rejected',
}

export const PROSPECT_TONE: Record<ProspectStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-violet-50 text-violet-700',
  replied: 'bg-amber-50 text-amber-700',
  interested: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  skipped: 'bg-zinc-100 text-zinc-400',
  rejected: 'bg-red-50 text-red-600',
}

/** Statuses where the invitation went out (and was not undone). */
const PAST_SENT: ProspectStatus[] = ['sent', 'accepted', 'replied', 'interested', 'declined']
const PAST_ACCEPTED: ProspectStatus[] = ['accepted', 'replied', 'interested', 'declined']
const PAST_REPLIED: ProspectStatus[] = ['replied', 'interested', 'declined']

// --- Settings (shared via app_settings) ----------------------------------------

export const OUTREACH_SETTINGS_KEY = 'outreach_settings'

export interface OutreachSettings {
  /** First message: connection note / first InMail. */
  tpl1: string
  /** Follow-up once they reply. */
  tpl2: string
  /** LinkedIn's connection-note limit. */
  charLimit: number
  /** Soft warning for a single day. */
  dayWarn: number
  /** Cap per natural week (Monday to Sunday). */
  weekLimit: number
}

export const DEFAULT_OUTREACH_SETTINGS: OutreachSettings = {
  tpl1: `Hi {{first_name}},

Your experience at {{company}} caught my attention. I work with a network of leading VC-backed startups across SF & NYC, specializing in GTM talent. I believe your profile could be a great fit within my client network.

Would you be open to working together?`,
  tpl2: `Hey {{first_name}},

Glad to hear back from you! I work with several top startups across different roles, so feel free to send me your CV and let me know what kind of opportunities you're interested in. I'd be happy to explore potential matches that align with your background and goals.

Looking forward to hearing from you!`,
  charLimit: 300,
  dayWarn: 20,
  weekLimit: 200,
}

export function parseOutreachSettings(value: unknown): OutreachSettings {
  const d = DEFAULT_OUTREACH_SETTINGS
  if (!value || typeof value !== 'object') return d
  const v = value as Record<string, unknown>
  const num = (x: unknown, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x) : fallback
  const str = (x: unknown, fallback: string) => (typeof x === 'string' && x.trim() ? x : fallback)
  return {
    tpl1: str(v.tpl1, d.tpl1),
    tpl2: str(v.tpl2, d.tpl2),
    charLimit: num(v.charLimit, d.charLimit),
    dayWarn: num(v.dayWarn, d.dayWarn),
    weekLimit: num(v.weekLimit, d.weekLimit),
  }
}

// --- Names and messages -------------------------------------------------------

function titleCase(s: string) {
  return /^[a-zà-ÿ'-]+$|^[A-ZÀ-Ý'-]+$/.test(s) && s.length > 1
    ? s[0].toUpperCase() + s.slice(1).toLowerCase()
    : s
}

export function firstName(full: string) {
  const n = (full || '').trim().replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
  return titleCase((n.split(/\s+/)[0] || '').replace(/[,;.]+$/, ''))
}

export function cleanCompany(c?: string | null) {
  return (c || '')
    .trim()
    .replace(/[,\s]+(inc|llc|ltd|corp|corporation|gmbh|co)\.?$/i, '')
    .trim()
}

export function fillTemplate(tpl: string, p: Pick<Prospect, 'name' | 'company'>) {
  return tpl
    .replace(/\{\{\s*first_name\s*\}\}/g, () => firstName(p.name))
    .replace(/\{\{\s*company\s*\}\}/g, () => cleanCompany(p.company))
}

/**
 * Puts the message on the clipboard twice: plain text, and HTML with an empty
 * paragraph between blocks. LinkedIn's rich-text editors paste the HTML and
 * keep the blank lines; plain-text fields use the text. Plain `\n\n` alone gets
 * collapsed into one line break.
 */
export async function copyMessage(text: string): Promise<boolean> {
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('<p><br></p>')
  try {
    if (typeof ClipboardItem === 'undefined') throw new Error('no ClipboardItem')
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}

// --- LinkedIn URLs ---------------------------------------------------------------

/** One canonical form, so the same person is never queued twice. */
export function normalizeLinkedIn(raw?: string | null) {
  const s = (raw || '').trim()
  if (!s) return ''
  const m = s.match(/linkedin\.com\/in\/([^/?#\s]+)/i)
  if (!m) return ''
  return `https://www.linkedin.com/in/${decodeURIComponent(m[1]).toLowerCase()}`
}

// --- CSV import ----------------------------------------------------------------------

export interface ParsedProspect {
  name: string
  company: string
  title: string
  location: string
  tier: string
  linkedin_url: string
}

/** Minimal RFC-4180 parser: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] || ''
  const sep = first.includes('\t') && !first.includes(',') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let f = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          f += '"'
          i++
        } else q = false
      } else f += c
    } else if (c === '"') q = true
    else if (c === sep) {
      row.push(f)
      f = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(f)
      rows.push(row)
      row = []
      f = ''
    } else f += c
  }
  if (f !== '' || row.length) {
    row.push(f)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

const HEADERS: Record<keyof ParsedProspect, RegExp> = {
  name: /^(name|nombre|full.?name)$/i,
  company: /^(company|empresa)$/i,
  title: /^(title|cargo|role|job.?title)$/i,
  location: /^(location|ubicaci[oó]n)$/i,
  tier: /^tier$/i,
  linkedin_url: /^(linkedin.?url|linkedin|url)$/i,
}

export interface ImportParse {
  rows: ParsedProspect[]
  /** Rows without a usable LinkedIn profile URL. */
  noUrl: number
  /** Same profile twice in the file. */
  duplicatesInFile: number
  /** The file doesn't look like an extraction. */
  error?: string
}

/** Reads the CSV the bookmarklet (or extract.js) produces. */
export function parseProspectCsv(text: string): ImportParse {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], noUrl: 0, duplicatesInFile: 0, error: 'The file is empty.' }
  const header = table[0].map((h) => h.trim())
  const idx = {} as Record<keyof ParsedProspect, number>
  for (const key of Object.keys(HEADERS) as (keyof ParsedProspect)[]) {
    idx[key] = header.findIndex((h) => HEADERS[key].test(h))
  }
  if (idx.name < 0 || idx.linkedin_url < 0) {
    return {
      rows: [],
      noUrl: 0,
      duplicatesInFile: 0,
      error: 'I need at least a "name" and a "linkedin_url" column.',
    }
  }
  const get = (r: string[], k: keyof ParsedProspect) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '')
  const seen = new Set<string>()
  const rows: ParsedProspect[] = []
  let noUrl = 0
  let duplicatesInFile = 0
  for (const r of table.slice(1)) {
    const url = normalizeLinkedIn(get(r, 'linkedin_url'))
    const name = get(r, 'name')
    if (!url || !name) {
      noUrl++
      continue
    }
    if (seen.has(url)) {
      duplicatesInFile++
      continue
    }
    seen.add(url)
    rows.push({
      name,
      company: get(r, 'company'),
      title: get(r, 'title'),
      location: get(r, 'location'),
      tier: get(r, 'tier'),
      linkedin_url: url,
    })
  }
  return { rows, noUrl, duplicatesInFile }
}

// --- Stats ----------------------------------------------------------------------------

export interface WeekBucket {
  start: Date
  count: number
  current: boolean
}

export interface OutreachStats {
  pending: number
  sent: number
  today: number
  /** Natural week: Monday 00:00 until now. This is what LinkedIn's weekly cap counts. */
  thisWeek: number
  last7: number
  accepted: number
  replied: number
  interested: number
  /** Postponed: reviewable in the Skipped tab. */
  skipped: number
  /** Decided not to contact. */
  rejected: number
  acceptanceRate: number | null
  replyRate: number | null
  /** Sent per natural week, oldest first, ending with the current one. */
  weeks: WeekBucket[]
}

const ts = (s?: string | null) => (s ? new Date(s).getTime() : NaN)

export function computeStats(rows: Prospect[], now = new Date(), weeksBack = 8): OutreachStats {
  const day0 = startOfDay(now).getTime()
  const week0 = startOfWeek(now).getTime()
  const d7 = now.getTime() - 7 * 864e5

  const sentRows = rows.filter((r) => PAST_SENT.includes(r.status) && r.sent_at)
  const sentAt = (r: Prospect) => ts(r.sent_at)

  const weeks: WeekBucket[] = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = addDays(startOfWeek(now), -7 * i)
    const end = addDays(start, 7)
    weeks.push({
      start,
      current: i === 0,
      count: sentRows.filter((r) => sentAt(r) >= start.getTime() && sentAt(r) < end.getTime()).length,
    })
  }

  const sent = sentRows.length
  const accepted = rows.filter((r) => PAST_ACCEPTED.includes(r.status)).length
  const replied = rows.filter((r) => PAST_REPLIED.includes(r.status)).length
  return {
    pending: rows.filter((r) => r.status === 'pending').length,
    sent,
    today: sentRows.filter((r) => sentAt(r) >= day0).length,
    thisWeek: sentRows.filter((r) => sentAt(r) >= week0).length,
    last7: sentRows.filter((r) => sentAt(r) >= d7).length,
    accepted,
    replied,
    interested: rows.filter((r) => r.status === 'interested').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    acceptanceRate: sent ? accepted / sent : null,
    replyRate: sent ? replied / sent : null,
    weeks,
  }
}

export const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)

/** How many were sent in the calendar week (Monday to Sunday) that starts at `weekStart`. */
export function sentInWeek(rows: Prospect[], weekStart: Date) {
  const from = weekStart.getTime()
  const to = addDays(weekStart, 7).getTime()
  return rows.filter((r) => {
    if (!r.sent_at || !PAST_SENT.includes(r.status)) return false
    const t = new Date(r.sent_at).getTime()
    return t >= from && t < to
  }).length
}

/** Sent per day of the calendar week starting at `weekStart` (Monday first), seven numbers. */
export function sentPerDay(rows: Prospect[], weekStart: Date) {
  const days = Array.from({ length: 7 }, () => 0)
  const from = weekStart.getTime()
  for (const r of rows) {
    if (!r.sent_at || !PAST_SENT.includes(r.status)) continue
    const i = Math.floor((startOfDay(new Date(r.sent_at)).getTime() - from) / 864e5 + 0.5)
    if (i >= 0 && i < 7) days[i]++
  }
  return days
}
