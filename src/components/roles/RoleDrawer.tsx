'use client'

import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore, FileText, Link2, Pencil, Trash2 } from 'lucide-react'
import Drawer from '@/components/common/Drawer'
import { StatusBadge, SourcePill } from '@/components/common/StatusBadge'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { formatDate } from '@/lib/dates'
import { RoleSource, WorkMode } from '@/types'
import { roleBaselineBounty } from '@/lib/journey'

export default function RoleDrawer() {
  const { openRoleId, closeRole, openCandidate } = useUI()
  const { roles, candidates, updateRole, archiveRole, restoreRole, deleteRole } = useData()
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
        paraform_link: role.paraform_link ?? '',
        job_description_link: role.job_description_link ?? '',
        description: role.description ?? '',
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
        paraform_link: form.paraform_link || undefined,
        job_description_link: form.job_description_link || undefined,
        description: form.description || undefined,
      })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Roles nobody was submitted to are deleted outright; anything with
   * candidates is archived, so those candidates keep the role they went for.
   */
  const remove = async () => {
    const hasCandidates = roleCandidates.length > 0
    const message = hasCandidates
      ? `Archive "${role.job_title}"? It leaves the roles list and the pickers, but its ${roleCandidates.length} candidate(s) keep it in their history.`
      : `Delete "${role.job_title}"? No candidate was submitted to it, so nothing else is affected.`
    if (!confirm(message)) return

    setBusy(true)
    try {
      if (hasCandidates) await archiveRole(role.id)
      else await deleteRole(role.id)
      closeRole()
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      await restoreRole(role.id)
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
            <Field label="Paraform link">
              <input
                type="url"
                placeholder="https://www.paraform.com/…"
                className={inputClass}
                value={form.paraform_link}
                onChange={(e) => setForm({ ...form, paraform_link: e.target.value })}
              />
            </Field>
            <Field label="Job description link">
              <input
                type="url"
                placeholder="https://…"
                className={inputClass}
                value={form.job_description_link}
                onChange={(e) => setForm({ ...form, job_description_link: e.target.value })}
              />
            </Field>
            <Field
              label="Description"
              hint="The whole job post: brief, requirements, process, company."
            >
              <textarea
                rows={10}
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
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

            {(role.paraform_link || role.job_description_link) && (
              <div className="flex flex-wrap gap-2">
                {role.paraform_link && (
                  <a
                    href={role.paraform_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
                  >
                    <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                    Paraform
                  </a>
                )}
                {role.job_description_link && (
                  <a
                    href={role.job_description_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
                  >
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    Job description
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <SourcePill source={role.source} />
              {role.archived_at && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                  <Archive className="h-3 w-3" />
                  Archived {formatDate(role.archived_at)}
                </span>
              )}
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

            {role.description && (
              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-zinc-900">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                  {role.description}
                </p>
              </section>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
              <button
                onClick={remove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {roleCandidates.length > 0 ? (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    Archive role
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete role
                  </>
                )}
              </button>
              {role.archived_at && (
                <button
                  onClick={restore}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Restore role
                </button>
              )}
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
      <div className="text-[0.6875rem] text-zinc-500">{label}</div>
      <div className="truncate text-sm font-medium capitalize text-zinc-900">{value}</div>
      {hint && <div className="truncate text-[0.6875rem] text-zinc-400">{hint}</div>}
    </div>
  )
}
