import { createClient } from '@supabase/supabase-js'
import { CandidateWithRole, StatusEvent } from '@/types'
import { buildJourneys } from '@/lib/journey'
import { PIPELINE_STATUSES, normalizeStatus, statusMeta } from '@/lib/status'
import { FOLLOW_UP_KEY, parseRules } from '@/lib/settings'

/**
 * The on-demand pipeline snapshot the bot answers `/pipeline` with.
 *
 * Runs on the server with the service key, because nobody is signed in on
 * the Telegram side — the chat allowlist is what guards the data.
 */

/** Telegram has no nested lists, so the second level is indented by hand. */
const INDENT = '\u2003\u2003'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Stage icons, matched to how loud that stage is in a stage-update message. */
const STAGE_ICONS: Record<string, string> = {
  calendly_sent: '📨',
  calendly_booked: '📅',
  to_be_submitted: '📋',
  standby: '⏸️',
  submitted: '📤',
  first_interview: '🎯',
  second_interview: '🔥',
  third_interview: '🔥',
  fourth_interview: '🔥',
  final_interview: '⚡',
  offer: '🏆',
}

/**
 * The stages worth reporting, in funnel order. Rejections, drops and hires
 * are all `active: false`, so they fall out on their own; candidates still
 * waiting for a role are not on the board at all, so they stay out too.
 */
const REPORT_STAGES = [...PIPELINE_STATUSES, 'standby' as const].filter(
  (status) => statusMeta(status).active
)

export async function pipelineReport(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return '⚠️ The report is not configured on the server.'

  const db = createClient(url, key)
  const [candidatesRes, eventsRes, settingsRes] = await Promise.all([
    db.from('candidates').select('*, role:roles(*)').order('created_at', { ascending: false }),
    db.from('candidate_status_events').select('*').order('occurred_at', { ascending: true }),
    db.from('app_settings').select('value').eq('key', FOLLOW_UP_KEY).maybeSingle(),
  ])

  if (candidatesRes.error) {
    return `⚠️ Could not read the pipeline: ${escapeHtml(candidatesRes.error.message)}`
  }

  const candidates = (candidatesRes.data as CandidateWithRole[]) ?? []
  const events = (eventsRes.data as StatusEvent[]) ?? []
  // The same follow-up thresholds the app flags stale candidates with.
  const rules = parseRules(settingsRes.data?.value)
  const journeys = buildJourneys(candidates, events, rules)

  const blocks: string[] = []

  for (const stage of REPORT_STAGES) {
    const here = journeys.filter((j) => j.status === stage && j.candidate.role_id)
    if (!here.length) continue

    // Grouped by role, so the same opening reads as one line with its
    // candidates under it instead of repeating itself on every row.
    const byRole = new Map<string, { label: string; names: string[] }>()
    for (const j of here) {
      const role = j.candidate.role
      const id = role?.id ?? 'none'
      const label = role ? `${role.job_title} @ ${role.company}` : 'No role yet'
      const group = byRole.get(id) ?? { label, names: [] }
      // Days in the stage, flagged when it is past its follow-up threshold.
      const age = `(${j.daysInStatus}d)${j.stale ? ' ❗' : ''}`
      group.names.push(`${escapeHtml(j.candidate.full_name)} <i>${age}</i>`)
      byRole.set(id, group)
    }

    const meta = statusMeta(stage)
    const lines = [...byRole.values()].flatMap((group) => [
      `• <b>${escapeHtml(group.label)}</b>`,
      ...group.names.map((name) => `${INDENT}◦ ${name}`),
    ])

    blocks.push([`${STAGE_ICONS[stage] ?? '•'} <b>${meta.label}</b> (${here.length})`, ...lines].join('\n'))
  }

  // "In play" means the same thing it means on the dashboard: submitted and
  // not yet closed. Anyone still short of submission is listed but not counted.
  const live = journeys.filter((j) => j.active && j.submittedAt)
  const value = live.reduce((sum, j) => sum + j.bounty, 0)

  const header = '📊 <b>Pipeline snapshot</b>\n━━━━━━━━━━━━━━━'
  if (!blocks.length) return `${header}\n\n<i>Nobody is in the pipeline right now.</i>`

  return [
    header,
    ...blocks,
    `👥 <b>${live.length}</b> in play\n💰 <b>$${value.toLocaleString('en-US')}</b> live pipeline`,
  ].join('\n\n')
}
