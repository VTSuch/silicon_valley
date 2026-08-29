'use client'

import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { CandidateStatus } from '@/types'
import { ALL_STATUSES, statusMeta } from '@/lib/status'
import { fromDateInput, toDateInput } from '@/lib/dates'
import DateInput from '@/components/common/DateInput'
import AddRoleModal from '@/components/roles/AddRoleModal'
import RoleCombobox from '@/components/common/RoleCombobox'

const EMPTY = {
  full_name: '',
  email: '',
  linkedin_url: '',
  role_id: '',
  notes: '',
  status: 'submitted' as CandidateStatus,
}

export default function AddCandidateModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { roles, createCandidate } = useData()
  const [form, setForm] = useState(EMPTY)
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [roleModal, setRoleModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role_id) {
      setError('Pick a role first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createCandidate(
        {
          full_name: form.full_name,
          email: form.email || 'n/a',
          linkedin_url: form.linkedin_url || undefined,
          role_id: form.role_id,
          notes: form.notes || undefined,
          status: form.status,
        },
        fromDateInput(date)
      )
      setForm(EMPTY)
      setDate(toDateInput(new Date()))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the candidate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="New candidate">
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Full name">
            <input
              required
              autoFocus
              className={inputClass}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email">
              <input
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                className={inputClass}
                placeholder="https://linkedin.com/in/…"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Role">
            <RoleCombobox
              roles={roles}
              value={form.role_id}
              onChange={(role_id) => setForm({ ...form, role_id })}
              onCreateNew={() => setRoleModal(true)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Starting stage">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CandidateStatus })}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusMeta(s).label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of that stage" hint="Used for metrics and follow-up alerts.">
              <DateInput eager value={date} onChange={setDate} className={inputClass} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={2}
              className={inputClass}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <GhostButton type="button" onClick={onClose}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create candidate'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <AddRoleModal
        open={roleModal}
        onClose={() => setRoleModal(false)}
        onCreated={(role) => setForm((prev) => ({ ...prev, role_id: role.id }))}
      />
    </>
  )
}
