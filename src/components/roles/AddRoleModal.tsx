'use client'

import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { Role, RoleSource, WorkMode } from '@/types'
import { roleBaselineBounty } from '@/lib/journey'

const EMPTY = {
  job_title: '',
  company: '',
  source: '',
  location: '',
  experience: '',
  work_mode: 'remote',
  work_mode_details: '',
  salary_min: '',
  salary_max: '',
  bounty_pct: '',
  bounty: '',
  description: '',
  requirements: '',
  skills: '',
  interview_process: '',
  about_company: '',
}

const LONG_FIELDS: { key: keyof typeof EMPTY; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'skills', label: 'Skills' },
  { key: 'interview_process', label: 'Interview process' },
  { key: 'about_company', label: 'About the company' },
]

export default function AddRoleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (role: Role) => void
}) {
  const { createRole } = useData()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  /**
   * The bounty follows the fee percentage applied to the bottom of the salary
   * band, which is the conservative figure. Typing in the bounty field itself
   * still wins.
   */
  const set = (key: keyof typeof EMPTY, value: string) => {
    const next = { ...form, [key]: value }
    if (key === 'bounty_pct' || key === 'salary_min') {
      const baseline = roleBaselineBounty(Number(next.salary_min), Number(next.bounty_pct))
      if (baseline !== null) next.bounty = String(baseline)
    }
    setForm(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const role = await createRole({
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
      onCreated?.(role)
      setForm(EMPTY)
      setShowDetails(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the role')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New role" size="sm:max-w-2xl">
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Job title">
            <input
              required
              autoFocus
              className={inputClass}
              value={form.job_title}
              onChange={(e) => set('job_title', e.target.value)}
            />
          </Field>
          <Field label="Company">
            <input
              required
              className={inputClass}
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Salary min">
            <input
              type="number"
              className={inputClass}
              value={form.salary_min}
              onChange={(e) => set('salary_min', e.target.value)}
            />
          </Field>
          <Field label="Salary max">
            <input
              type="number"
              className={inputClass}
              value={form.salary_max}
              onChange={(e) => set('salary_max', e.target.value)}
            />
          </Field>
          <Field label="Fee %">
            <input
              type="number"
              step="0.01"
              placeholder="17.5"
              className={inputClass}
              value={form.bounty_pct}
              onChange={(e) => set('bounty_pct', e.target.value)}
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
        </div>
        <p className="-mt-2 text-xs text-zinc-400">
          The bounty fills in automatically as fee % × salary min — the conservative
          figure. Override it if the client agreed something else.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
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
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
          <Field label="Work mode">
            <select
              className={inputClass}
              value={form.work_mode}
              onChange={(e) => set('work_mode', e.target.value)}
            >
              <option value="remote">Remote</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          <Field label="Experience">
            <input
              className={inputClass}
              placeholder="5+ years"
              value={form.experience}
              onChange={(e) => set('experience', e.target.value)}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900"
        >
          {showDetails ? 'Hide' : 'Add'} full job description
        </button>

        {showDetails && (
          <div className="space-y-3">
            <Field label="Work mode details">
              <input
                className={inputClass}
                value={form.work_mode_details}
                onChange={(e) => set('work_mode_details', e.target.value)}
              />
            </Field>
            {LONG_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </Field>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create role'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
