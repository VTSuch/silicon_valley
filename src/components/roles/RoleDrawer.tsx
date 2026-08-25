'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Drawer from '@/components/common/Drawer'
import { StatusBadge, SourcePill } from '@/components/common/StatusBadge'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { formatDate } from '@/lib/dates'
import { RoleSource, WorkMode } from '@/types'
import { roleBaselineBounty } from '@/lib/journey'

const SECTIONS: { key: 'description' | 'requirements' | 'skills' | 'interview_process' | 'about_company'; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'skills', label: 'Skills' },
  { key: 'interview_process', label: 'Interview process' },
  { key: 'about_company', label: 'About the company' },
]

export default function RoleDrawer() {
  const { openRoleId, closeRole, openCandidate } = useUI()
  const { roles, candidates, updateRole, deleteRole } = useData()
  const role = roles.find((r) => r.id === openRoleId) ?? null
  const roleCandidates = candidates.filter((c) => c.role_id === openRoleId)

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    setEditing(false)
    if (role) {
      setForm({
        job_title: role.job_title,
        company: role.company,
        source: role.source ?? '',
        location: role.location ?? '',
        experience: role.experience ?? '',
        work_mode: role.work_mode,
        work_mode_details: role.work_mode_details ?? '',
        salary_min: role.salary_min?.toString() ?? '',
        salary_max: role.salary_max?.toString() ?? '',
        bounty: role.bounty?.toString() ?? '',
        bounty_pct: role.bounty_pct?.toString() ?? '',
        description: role.description ?? '',
        requirements: role.requirements ?? '',
        skills: role.skills ?? '',
        interview_process: role.interview_process ?? '',
        about_company: role.about_company ?? '',
      })
    }
  }, [role?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!role) return null

  /** Keep the baseline bounty in step with the fee percentage. */
  const setSalaryOrPct = (key: 'salary_min' | 'bounty_pct', value: string) => {
    const next = { ...form, [key]: value }
    const baseline = roleBaselineBounty(Number(next.salary_min), Number(next.bounty_pct))
    if (baseline !== null) next.bounty = String(baseline)
    setForm(next)
  }

  const save = async () => {
    setBusy(true)
    try {
      await updateRole(role.id, {
        job_title: form.job_title,
        company: form.company,
        source: (form.source || undefined) as RoleSource | undefined,
        location: form.location || undefined,
        experience: form.experience || undefined,
        work_mode: form.work_mode as WorkMode,
        work_mode_details: form.work_mode_details || undefined,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        bounty: form.bounty ? Number(form.bounty) : undefined,
        bounty_pct: form.bounty_pct ? Number(form.bounty_pct) : undefined,
        description: form.description || undefined,
        requirements: form.requirements || undefined,
        skills: form.skills || undefined,
        interview_process: form.interview_process || undefined,
        about_company: form.about_company || undefined,
      })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (
      !confirm(
        `Delete "${role.job_title}"? Its ${roleCandidates.length} candidate(s) will be deleted too.`
      )
    )
      return
    setBusy(true)
    try {
      await deleteRole(role.id)
      closeRole()
    } finally {
      setBusy(false)
    }
  }

  const salary =
    role.salary_min || role.salary_max
      ? `${role.salary_min ? `$${role.salary_min.toLocaleString()}` : '?'} – ${role.salary_max ? `$${role.salary_max.toLocaleString()}` : '?'}`
      : '—'

  return (
    <Drawer
      open
      onClose={closeRole}
      subtitle={role.company}
      title={role.job_title}
      width="sm:max-w-2xl"
      actions={
        <button
          onClick={() => setEditing((v) => !v)}
          className={`rounded-lg p-1.5 hover:bg-zinc-100 ${editing ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-700'}`}
          title="Edit role"
        >
          <Pencil className="h-4.5 w-4.5" />
        </button>
      }
    >
      <div className="space-y-6 p-5">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Job title">
                <input
                  className={inputClass}
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                />
              </Field>
              <Field label="Company">
                <input
                  className={inputClass}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </Field>
              <Field label="Source">
                <select
                  className={inputClass}
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="Upnest">Upnest</option>
                  <option value="Paraform">Paraform</option>
                </select>
              </Field>
              <Field label="Location">
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </Field>
              <Field label="Work mode">
                <select
                  className={inputClass}
                  value={form.work_mode}
                  onChange={(e) => setForm({ ...form, work_mode: e.target.value })}
                >
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Experience">
                <input
                  className={inputClass}
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                />
              </Field>
              <Field label="Salary min">
                <input
                  type="number"
                  className={inputClass}
                  value={form.salary_min}
                  onChange={(e) => setSalaryOrPct('salary_min', e.target.value)}
                />
              </Field>
              <Field label="Fee %" hint="Bounty = fee % × salary min.">
                <input
                  type="number"
                  step="0.01"
                  placeholder="17.5"
                  className={inputClass}
                  value={form.bounty_pct}
                  onChange={(e) => setSalaryOrPct('bounty_pct', e.target.value)}
                />
              </Field>
              <Field label="Salary max">
                <input
                  type="number"
                  className={inputClass}
                  value={form.salary_max}
                  onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                />
              </Field>
              <Field label="Bounty">
                <input
                  type="number"
                  className={inputClass}
                  value={form.bounty}
                  onChange={(e) => setForm({ ...form, bounty: e.target.value })}
                />
              </Field>
              <Field label="Work mode details">
                <input
                  className={inputClass}
                  value={form.work_mode_details}
                  onChange={(e) => setForm({ ...form, work_mode_details: e.target.value })}
                />
              </Field>
            </div>
            {SECTIONS.map((s) => (
              <Field key={s.key} label={s.label}>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form[s.key]}
                  onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                />
              </Field>
            ))}
            <div className="flex gap-2">
              <PrimaryButton onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </PrimaryButton>
              <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Bounty"
                value={role.bounty ? `$${role.bounty.toLocaleString()}` : '—'}
                hint={role.bounty_pct ? `${role.bounty_pct}% of salary` : undefined}
              />
              <Stat label="Salary" value={salary} />
              <Stat label="Location" value={role.location || '—'} />
              <Stat label="Mode" value={role.work_mode} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <SourcePill source={role.source} />
              {role.experience && <span>Experience: {role.experience}</span>}
              <span>Added {formatDate(role.created_at)}</span>
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                Candidates ({roleCandidates.length})
              </h3>
              {roleCandidates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
                  No candidates submitted for this role yet.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                  {roleCandidates.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          closeRole()
                          openCandidate(c.id)
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50"
                      >
                        <span className="truncate text-sm text-zinc-900">{c.full_name}</span>
                        <StatusBadge status={c.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {SECTIONS.filter((s) => role[s.key]).map((s) => (
              <section key={s.key}>
                <h3 className="mb-1.5 text-sm font-semibold text-zinc-900">{s.label}</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                  {role[s.key]}
                </p>
              </section>
            ))}

            <div className="border-t border-zinc-100 pt-4">
              <button
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete role
              </button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="truncate text-sm font-medium capitalize text-zinc-900">{value}</div>
      {hint && <div className="truncate text-[11px] text-zinc-400">{hint}</div>}
    </div>
  )
}
