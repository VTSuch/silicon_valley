'use client'

import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { Field, GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import { useOutreach } from '@/context/OutreachContext'

export default function NewSearchModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const { createSearch } = useOutreach()
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const s = await createSearch({ job_title: title, location, notes })
      setTitle('')
      setLocation('')
      setNotes('')
      onClose()
      onCreated(s.id)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not create the search')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New search">
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Job title">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Account Executive"
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="San Francisco"
            className={inputClass}
          />
        </Field>
        <Field label="Notes" hint="Optional: seniority, target companies, the Paraform filters you used…">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <GhostButton type="button" onClick={onClose}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={busy || !title.trim()}>
            Create search
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
