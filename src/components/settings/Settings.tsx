'use client'

import { useState } from 'react'
import { Bell, CalendarRange, Check } from 'lucide-react'
import { useData } from '@/context/DataContext'
import DateInput from '@/components/common/DateInput'
import { GhostButton, PrimaryButton, inputClass } from '@/components/common/Field'
import FollowUpSettings from '@/components/dashboard/FollowUpSettings'
import {
  DEFAULT_FOCUS_PERIOD_START,
  formatDate,
  fromDateInput,
  startOfDay,
  toDateInput,
} from '@/lib/dates'

export default function Settings() {
  const { focusPeriodStart, saveFocusPeriodStart } = useData()
  const [draft, setDraft] = useState<Date>(focusPeriodStart)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const dirty = toDateInput(draft) !== toDateInput(focusPeriodStart)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveFocusPeriodStart(startOfDay(draft))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the focus period')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">
          The knobs the rest of the app reads from.
        </p>
      </div>

      <section className="max-w-2xl rounded-xl border border-zinc-200 bg-white">
        <header className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3">
          <CalendarRange className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Focus period</h2>
        </header>
        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-500">
            The stretch of work you are measuring right now. Everything that filters by
            &ldquo;This focus period&rdquo; — the dashboard toggle, the pipeline board, the
            metrics filters — starts from this date and runs to today.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Start date</span>
              <DateInput
                value={draft}
                onChange={(next) => setDraft(fromDateInput(next))}
                className={`${inputClass} w-44`}
              />
            </label>
            <PrimaryButton onClick={save} disabled={!dirty || busy}>
              {busy ? 'Saving…' : 'Save'}
            </PrimaryButton>
            {toDateInput(draft) !== toDateInput(DEFAULT_FOCUS_PERIOD_START) && (
              <GhostButton onClick={() => setDraft(DEFAULT_FOCUS_PERIOD_START)}>
                Reset
              </GhostButton>
            )}
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-zinc-400">
            In effect: {formatDate(focusPeriodStart)} → today.
          </p>
        </div>
      </section>

      <section className="max-w-2xl rounded-xl border border-zinc-200 bg-white">
        <header className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3">
          <Bell className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Follow-up rules</h2>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-zinc-500">
            How long a candidate may sit in each stage before it needs chasing.
          </p>
          <PrimaryButton onClick={() => setRulesOpen(true)}>Edit rules</PrimaryButton>
        </div>
      </section>

      <FollowUpSettings open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}
