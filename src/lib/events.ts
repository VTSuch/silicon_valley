/**
 * The pipeline events we announce on Telegram, and how each one reads.
 *
 * Payloads carry already-resolved, human-readable fields: the browser knows
 * the role behind a candidate and the label behind a status, so the notifier
 * never has to go back to the database to write a sentence.
 */

export interface CandidateSummary {
  name: string
  /** Job title of the role they are on, or null while they need one. */
  jobTitle: string | null
  company: string | null
  bounty: number | null
  status: string
  email?: string | null
}

export interface RoleSummary {
  jobTitle: string
  company: string
  location?: string | null
  bounty: number | null
  bountyPct?: number | null
}

/** One before/after pair, already written the way a person would read it. */
export interface FieldChange {
  field: string
  from: string
  to: string
}

export type PipelineEvent =
  | { type: 'candidate_created'; candidate: CandidateSummary }
  | {
      type: 'candidate_status_changed'
      candidate: CandidateSummary
      from: string | null
      to: string
      /** Status id of the new stage, so milestones can be dressed up. */
      toId?: string
      note?: string | null
    }
  | { type: 'candidate_updated'; candidate: CandidateSummary; changes: FieldChange[] }
  | { type: 'candidate_deleted'; candidate: CandidateSummary }
  | {
      type: 'follow_up_logged'
      candidate: CandidateSummary
      note?: string | null
      author?: string | null
    }
  | { type: 'role_created'; role: RoleSummary }
  | { type: 'role_updated'; role: RoleSummary; changes: FieldChange[] }
  | { type: 'role_archived'; role: RoleSummary }
  | { type: 'role_restored'; role: RoleSummary }
  | { type: 'role_deleted'; role: RoleSummary }
  | { type: 'note_created'; body: string; author?: string | null }

const HEADINGS: Record<PipelineEvent['type'], { icon: string; title: string }> = {
  candidate_created: { icon: '🆕', title: 'New candidate' },
  candidate_status_changed: { icon: '🔄', title: 'Stage update' },
  candidate_updated: { icon: '✏️', title: 'Candidate update' },
  candidate_deleted: { icon: '🗑️', title: 'Candidate removed' },
  follow_up_logged: { icon: '📞', title: 'Follow-up logged' },
  role_created: { icon: '🆕', title: 'New role' },
  role_updated: { icon: '✏️', title: 'Role update' },
  role_archived: { icon: '📦', title: 'Role archived' },
  role_restored: { icon: '♻️', title: 'Role restored' },
  role_deleted: { icon: '🗑️', title: 'Role removed' },
  note_created: { icon: '📝', title: 'New note' },
}

const DIVIDER = '━━━━━━━━━━━━━━━'

/**
 * How loud a stage move should be. The further down the funnel, the more the
 * message shouts — a submission is news, an offer is a big deal, a hire is a
 * party — and anything lost reads unmistakably as lost.
 */
interface StageStyle {
  icon: string
  title: string
  /** Closing line that gives the milestone its weight. */
  banner?: string
}

const STAGE_STYLES: Record<string, StageStyle> = {
  submitted: { icon: '📤', title: 'Candidate submitted' },
  first_interview: { icon: '🎯', title: 'Interview stage' },
  second_interview: { icon: '🔥', title: 'Interview stage' },
  third_interview: { icon: '🔥', title: 'Interview stage' },
  fourth_interview: { icon: '🔥', title: 'Interview stage' },
  final_interview: {
    icon: '⚡',
    title: 'FINAL STAGE',
    banner: '⚡ <i>One step away from an offer</i>',
  },
  offer: {
    icon: '🏆',
    title: 'OFFER EXTENDED',
    banner: '🏆 <i>Offer on the table</i>',
  },
  offer_accepted: {
    icon: '🎉',
    title: 'HIRED! 🎉',
    banner: '🥳 <i>Deal closed — congratulations!</i>',
  },
  offer_rejected: { icon: '❌', title: 'Offer rejected' },
  cv_rejected: { icon: '❌', title: 'Submission rejected' },
  client_rejected: { icon: '❌', title: 'Rejected in stages' },
  candidate_quit: { icon: '🛑', title: 'Candidate dropped' },
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function money(value: number | null | undefined) {
  return typeof value === 'number' && !Number.isNaN(value)
    ? `$${value.toLocaleString('en-US')}`
    : null
}

/** Keeps long free text from turning a notification into a wall. */
function trim(text: string, max = 300) {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/** A block of related lines. Empty ones drop out, so no stray blank space. */
type Section = (string | null)[]

function who(name: string): Section {
  return [`👤 <b>${escapeHtml(name)}</b>`]
}

/** Role and company always travel together, apart from everything else. */
function placement(jobTitle: string | null, company: string | null): Section {
  if (!jobTitle) return ['💼 <i>Looking for a role</i>']
  return [`💼 ${escapeHtml(jobTitle)}`, company ? `🏢 ${escapeHtml(company)}` : null]
}

/** The money gets a line of its own — it is the part worth spotting fast. */
function bountyLine(value: number | null | undefined, pct?: number | null): Section {
  const amount = money(value)
  if (!amount) return []
  return [`💰 <b>${amount}</b>${pct ? ` · ${pct}%` : ''}`]
}

function stage(label: string): Section {
  return [`📍 ${escapeHtml(label)}`]
}

function changeLines(changes: FieldChange[]): Section {
  return changes.map(
    (c) => `• <b>${escapeHtml(c.field)}:</b> ${escapeHtml(c.from || '—')} → ${escapeHtml(c.to || '—')}`
  )
}

function candidateBlocks(candidate: CandidateSummary): Section[] {
  return [who(candidate.name), placement(candidate.jobTitle, candidate.company)]
}

function roleBlocks(role: RoleSummary): Section[] {
  return [
    [`💼 <b>${escapeHtml(role.jobTitle)}</b>`, `🏢 ${escapeHtml(role.company)}`],
    role.location ? [`📍 ${escapeHtml(role.location)}`] : [],
  ]
}

/**
 * Renders an event as the Telegram message: the same header on every
 * notification, then one blank line between each block, so who / where /
 * how much / what changed each read on their own.
 */
export function formatEvent(event: PipelineEvent): string {
  const milestone =
    event.type === 'candidate_status_changed' && event.toId
      ? STAGE_STYLES[event.toId]
      : undefined
  const { icon, title } = milestone ?? HEADINGS[event.type]
  let sections: Section[] = []

  switch (event.type) {
    case 'candidate_created':
      sections = [
        ...candidateBlocks(event.candidate),
        bountyLine(event.candidate.bounty),
        stage(event.candidate.status),
      ]
      break

    case 'candidate_status_changed':
      sections = [
        ...candidateBlocks(event.candidate),
        [
          `📍 ${escapeHtml(event.from ?? '—')} → <b>${escapeHtml(event.to)}</b>`,
          event.note ? `📝 ${escapeHtml(trim(event.note))}` : null,
        ],
        bountyLine(event.candidate.bounty),
        milestone?.banner ? [milestone.banner] : [],
      ]
      break

    case 'candidate_updated':
      sections = [...candidateBlocks(event.candidate), changeLines(event.changes)]
      break

    case 'candidate_deleted':
      sections = [...candidateBlocks(event.candidate), stage(`Last stage: ${event.candidate.status}`)]
      break

    case 'follow_up_logged':
      sections = [
        ...candidateBlocks(event.candidate),
        stage(event.candidate.status),
        [
          event.author ? `🙋 ${escapeHtml(event.author)}` : null,
          event.note ? `📝 ${escapeHtml(trim(event.note))}` : null,
        ],
      ]
      break

    case 'role_created':
    case 'role_archived':
    case 'role_restored':
    case 'role_deleted':
      sections = [...roleBlocks(event.role), bountyLine(event.role.bounty, event.role.bountyPct)]
      break

    case 'role_updated':
      sections = [...roleBlocks(event.role), changeLines(event.changes)]
      break

    case 'note_created':
      sections = [
        [`📝 ${escapeHtml(trim(event.body, 600))}`],
        event.author ? [`🙋 ${escapeHtml(event.author)}`] : [],
      ]
      break
  }

  const blocks = sections
    .map((section) => section.filter((line): line is string => !!line).join('\n'))
    .filter(Boolean)

  return [`${icon} <b>${title}</b>\n${DIVIDER}`, ...blocks].join('\n\n')
}
