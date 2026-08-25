'use client'

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import Modal from '@/components/common/Modal'
import { GhostButton, PrimaryButton } from '@/components/common/Field'
import { useData } from '@/context/DataContext'
import { CandidateStatus } from '@/types'
import { statusMeta } from '@/lib/status'
import {
  CONFIGURABLE_STATUSES,
  FollowUpRules,
  defaultRules,
  thresholdFor,
} from '@/lib/settings'

export default function FollowUpSettings({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { followUpRules, saveFollowUpRules } = useData()
  const [draft, setDraft] = useState<FollowUpRules>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const next: FollowUpRules = {}
    for (const s of CONFIGURABLE_STATUSES) next[s] = thresholdFor(s, followUpRules)
    setDraft(next)
    setError(null)
  }, [open, followUpRules])

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveFollowUpRules(draft)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the rules')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Follow-up rules">
      <div className="space-y-4 p-5">
        <p className="text-sm text-zinc-500">
          How many days a candidate may sit in each stage before it shows up as a follow-up.
          Leave a stage empty to never chase it.
        </p>

        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
          {CONFIGURABLE_STATUSES.map((s: CandidateStatus) => {
            const meta = statusMeta(s)
            const value = draft[s]
            return (
              <li key={s} className="flex items-center gap-3 px-3 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{meta.label}</span>
                <input
                  type="number"
                  min={0}
                  placeholder="never"
                  value={value ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [s]: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-400"
                />
                <span className="w-8 shrink-0 text-xs text-zinc-400">days</span>
              </li>
            )
          })}
        </ul>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={() => setDraft(defaultRules())}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save rules'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}
