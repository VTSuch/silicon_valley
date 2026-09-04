'use client'

import { supabase } from '@/lib/supabase'
import { CandidateSummary, FieldChange, PipelineEvent, RoleSummary } from '@/lib/events'
import { STATUS_META } from '@/lib/status'
import { Candidate, CandidateStatus, Role } from '@/types'

/**
 * Announces pipeline activity on Telegram.
 *
 * Every call is fire-and-forget: a notification that fails must never take a
 * save down with it, so nothing here throws and nothing here is awaited by
 * the mutation that triggered it.
 */
export function notify(event: PipelineEvent) {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(event),
      })
    } catch (e) {
      console.warn('Telegram notification failed', e)
    }
  })()
}

export function statusLabel(status: CandidateStatus | null | undefined) {
  return status ? STATUS_META[status]?.label ?? status : null
}

export function candidateSummary(
  candidate: Pick<Candidate, 'full_name' | 'email' | 'status' | 'hired_salary'>,
  role: Role | null | undefined
): CandidateSummary {
  // A hired salary with an agreed percentage beats the role's baseline bounty.
  const bounty =
    candidate.hired_salary && role?.bounty_pct
      ? Math.round((candidate.hired_salary * role.bounty_pct) / 100)
      : role?.bounty ?? null

  return {
    name: candidate.full_name,
    jobTitle: role?.job_title ?? null,
    company: role?.company ?? null,
    bounty,
    status: statusLabel(candidate.status) ?? candidate.status,
    email: candidate.email ?? null,
  }
}

export function roleSummary(role: Role): RoleSummary {
  return {
    jobTitle: role.job_title,
    company: role.company,
    location: role.location ?? null,
    bounty: role.bounty ?? null,
    bountyPct: role.bounty_pct ?? null,
  }
}

const CANDIDATE_LABELS: Record<string, string> = {
  full_name: 'Name',
  email: 'Email',
  linkedin_url: 'LinkedIn',
  notes: 'Notes',
  hired_salary: 'Hired salary',
  next_search_at: 'Next role search',
  role_id: 'Role',
}

const ROLE_LABELS: Record<string, string> = {
  job_title: 'Job title',
  company: 'Company',
  location: 'Location',
  salary_min: 'Salary min',
  salary_max: 'Salary max',
  work_mode: 'Work mode',
  work_mode_details: 'Work mode details',
  experience: 'Experience',
  description: 'Description',
  bounty: 'Bounty',
  bounty_pct: 'Bounty %',
  paraform_link: 'Paraform link',
  job_description_link: 'Job description link',
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString('en-US')
  const text = String(value)
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

/**
 * Turns a patch into readable before/after lines, skipping fields that were
 * not touched, that did not really change, or that are announced on their own
 * (status moves get their own message).
 */
function diff(
  before: object,
  updates: Record<string, unknown>,
  labels: Record<string, string>,
  resolve?: (field: string, value: unknown) => string | null
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const [field, next] of Object.entries(updates)) {
    const label = labels[field]
    if (!label) continue

    const prev = (before as Record<string, unknown>)[field]
    if ((prev ?? null) === (next ?? null)) continue
    // Description edits are common and long; say it changed, not what to.
    if (field === 'description') {
      changes.push({ field: label, from: 'previous version', to: 'updated' })
      continue
    }

    changes.push({
      field: label,
      from: resolve?.(field, prev) ?? display(prev),
      to: resolve?.(field, next) ?? display(next),
    })
  }
  return changes
}

export function diffCandidate(
  before: object,
  updates: Record<string, unknown>,
  roleName: (id: unknown) => string | null
): FieldChange[] {
  return diff(before, updates, CANDIDATE_LABELS, (field, value) =>
    field === 'role_id' ? roleName(value) ?? 'No role yet' : null
  )
}

export function diffRole(before: object, updates: Record<string, unknown>): FieldChange[] {
  return diff(before, updates, ROLE_LABELS)
}
