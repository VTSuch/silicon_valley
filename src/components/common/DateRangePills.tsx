'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import Calendar from './Calendar'
import {
  DateRange,
  RangePresetId,
  endOfDay,
  formatDate,
  presetRange,
  startOfDay,
} from '@/lib/dates'

export interface RangeSelection {
  preset: RangePresetId
  range: DateRange
}

const MORE: { id: RangePresetId; label: string }[] = [
  { id: 'last_3_months', label: 'Last 3 months' },
  { id: 'all_time', label: 'All time' },
]

/** Presets that get their own always-visible pill. */
const PILLS: { id: RangePresetId; label: string }[] = [
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_year', label: 'This year' },
]

export function defaultSelection(): RangeSelection {
  return { preset: 'all_time', range: presetRange('all_time') }
}

interface Props {
  value: RangeSelection
  onChange: (next: RangeSelection) => void
}

export default function DateRangePills({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<DateRange>({ from: null, to: null })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setPicking(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const select = (preset: RangePresetId) => {
    onChange({ preset, range: presetRange(preset) })
    setOpen(false)
    setPicking(false)
  }

  const pickDay = (date: Date) => {
    // First click sets the start, second click closes the range.
    if (!draft.from || draft.to) {
      setDraft({ from: startOfDay(date), to: null })
      return
    }
    if (date < draft.from) {
      setDraft({ from: startOfDay(date), to: null })
      return
    }
    const range = { from: draft.from, to: endOfDay(date) }
    setDraft(range)
    onChange({ preset: 'custom', range })
    setOpen(false)
    setPicking(false)
  }

  const pillBase =
    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap'
  const on = 'bg-zinc-900 text-white'
  const off = 'text-zinc-600 hover:bg-white hover:text-zinc-900'

  const moreLabel =
    value.preset === 'custom'
      ? `${formatDate(value.range.from)} → ${formatDate(value.range.to)}`
      : (MORE.find((m) => m.id === value.preset)?.label ?? 'More')

  const moreActive = !PILLS.some((p) => p.id === value.preset)

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1">
      {PILLS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => select(p.id)}
          className={`${pillBase} ${value.preset === p.id ? on : off}`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${pillBase} inline-flex items-center gap-1 ${moreActive ? on : off}`}
      >
        {moreLabel}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="sv-fade-in absolute right-0 top-full z-50 mt-2 w-max min-w-[220px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          {!picking ? (
            <>
              {MORE.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => select(m.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {m.label}
                  {value.preset === m.id && <Check className="h-4 w-4 text-zinc-900" />}
                </button>
              ))}
              <div className="my-1 h-px bg-zinc-100" />
              <button
                type="button"
                onClick={() => {
                  setDraft({ from: null, to: null })
                  setPicking(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                Custom range…
              </button>
            </>
          ) : (
            <div className="p-2">
              <div className="mb-2 text-xs font-medium text-zinc-500">
                {!draft.from ? 'Pick the start date' : 'Pick the end date'}
              </div>
              <Calendar from={draft.from} to={draft.to} onPick={pickDay} />
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
