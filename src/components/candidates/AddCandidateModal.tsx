'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/common/Modal'
import DateInput from '@/components/common/DateInput'
import RoleCombobox from '@/components/common/RoleCombobox'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { CandidateStatus } from '@/types'
import { ALL_STATUSES, statusMeta } from '@/lib/status'
import { fromDateInput, toDateInput } from '@/lib/dates'
import AddRoleModal from '@/components/roles/AddRoleModal'

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
  const { activeRoles, candidates, createCandidate, updateCandidate } = useData()
  const { addCandidatePrefill } = useUI()
  const [form, setForm] = useState(EMPTY)
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [roleModal, setRoleModal] = useState(false)
  const [keepSearching, setKeepSearching] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const source = addCandidatePrefill?.sourceCandidateId
    ? (candidates.find((c) => c.id === addCandidatePrefill.sourceCandidateId) ?? null)
    : null

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY,
      full_name: addCandidatePrefill?.full_name ?? '',
      email: addCandidatePrefill?.email ?? '',
      linkedin_url: addCandidatePrefill?.linkedin_url ?? '',
      notes: addCandidatePrefill?.notes ?? '',
      role_id: addCandidatePrefill?.role_id ?? '',
    })
    setDate(toDateInput(new Date()))
    setKeepSearching(true)
    setError(null)
  }, [open, addCandidatePrefill])

  // Without a role there is only one sensible stage.
  const status: CandidateStatus = form.role_id ? form.status : 'needs_role'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Assigning a role to a role-search candidate: either convert that
      // candidate, or leave them searching and create a second card.
      if (source && form.role_id && !keepSearching) {
        await updateCandidate(source.id, {
          role_id: form.role_id,
          status,
          next_search_at: null,
        })
      } else {
        await createCandidate(
          {
            full_name: form.full_name,
            email: form.email || 'n/a',
            linkedin_url: form.linkedin_url || undefined,
            role_id: form.role_id || null,
            notes: form.notes || undefined,
            status,
          },
          fromDateInput(date)
        )
      }
      setForm(EMPTY)
      setDate(toDateInput(new Date()))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the candidate')
    } finally {
      setBusy(false)
    }
  }

  const title = source ? `Find a role for ${source.full_name}` : 'New candidate'

  return (
    <>
      <Modal open={open} onClose={onClose} title={title}>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Full name">
            <input
              required
              autoFocus={!addCandidatePrefill}
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

          <Field
            label="Role"
            hint={
              form.role_id
                ? undefined
                : 'Parked as “Needs a role” — they show up in the role search list.'
            }
          >
            <RoleCombobox
              roles={activeRoles}
              value={form.role_id}
              onChange={(role_id) => setForm({ ...form, role_id })}
              onCreateNew={() => setRoleModal(true)}
              allowNone
            />
          </Field>

          {source && form.role_id && (
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 p-3">
              <input
                type="checkbox"
                checked={keepSearching}
                onChange={(e) => setKeepSearching(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="text-xs text-zinc-700">
                <span className="font-medium text-zinc-900">
                  Keep {source.full_name} in the role search list
                </span>
                <span className="mt-0.5 block text-zinc-500">
                  {keepSearching
                    ? 'Creates a second card for this role and leaves the original searching.'
                    : 'Moves the existing card onto this role instead of creating a new one.'}
                </span>
              </span>
            </label>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Starting stage">
              <select
                disabled={!form.role_id}
                className={`${inputClass} disabled:bg-zinc-50 disabled:text-zinc-400`}
                value={status}
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
              {busy ? 'Saving…' : source && form.role_id && !keepSearching ? 'Assign role' : 'Create candidate'}
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
