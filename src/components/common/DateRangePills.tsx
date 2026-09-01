'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import Calendar from './Calendar'
import DateWheel from './DateWheel'
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

export const PRESET_LABELS: Record<RangePresetId, string> = {
  this_week: 'This week',
  this_month: 'This month',
  this_year: 'This year',
  focus_period: 'This focus period',
  last_3_months: 'Last 3 months',
  all_time: 'All time',
  custom: 'Custom range',
}

const DEFAULT_PILLS: RangePresetId[] = ['this_week', 'this_month', 'this_year']
const DEFAULT_MORE: RangePresetId[] = ['last_3_months', 'all_time']

export function defaultSelection(): RangeSelection {
  return { preset: 'all_time', range: presetRange('all_time') }
}

interface Props {
  value: RangeSelection
  onChange: (next: RangeSelection) => void
  /** Presets with their own always-visible button. */
  pills?: RangePresetId[]
  /** Presets tucked inside the dropdown. */
  more?: RangePresetId[]
  /** Custom-range UI: one calendar, or day/month/year wheels for each end. */
  picker?: 'calendar' | 'wheel'
}

export default function DateRangePills({
  value,
  onChange,
  pills = DEFAULT_PILLS,
  more = DEFAULT_MORE,
  picker = 'calendar',
}: Props) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [draft, setDraft] = useState<DateRange>({ from: null, to: null })
  const [wheelFrom, setWheelFrom] = useState<Date>(() => startOfDay(new Date()))
  const [wheelTo, setWheelTo] = useState<Date>(() => startOfDay(new Date()))
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
      : (more.includes(value.preset) ? PRESET_LABELS[value.preset] : 'More')

  const moreActive = !pills.includes(value.preset)

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1">
      {pills.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => select(id)}
          className={`${pillBase} ${value.preset === id ? on : off}`}
        >
          {PRESET_LABELS[id]}
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
              {more.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {PRESET_LABELS[id]}
                  {value.preset === id && <Check className="h-4 w-4 text-zinc-900" />}
                </button>
              ))}
              <div className="my-1 h-px bg-zinc-100" />
              <button
                type="button"
                onClick={() => {
                  setDraft({ from: null, to: null })
                  const base = value.range.from ?? startOfDay(new Date())
                  setWheelFrom(base)
                  setWheelTo(value.range.to ?? startOfDay(new Date()))
                  setPicking(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                Custom range…
              </button>
            </>
          ) : picker === 'wheel' ? (
            <div className="w-[26rem] max-w-[90vw] p-3">
              <div className="flex gap-3">
                <DateWheel label="Start date" value={wheelFrom} onChange={setWheelFrom} />
                <DateWheel label="End date" value={wheelTo} onChange={setWheelTo} />
              </div>
              {wheelTo < wheelFrom && (
                <p className="mt-2 text-xs text-red-600">
                  The end date is before the start date.
                </p>
              )}
              <div className="mt-3 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={wheelTo < wheelFrom}
                  onClick={() => {
                    onChange({
                      preset: 'custom',
                      range: { from: startOfDay(wheelFrom), to: endOfDay(wheelTo) },
                    })
                    setOpen(false)
                    setPicking(false)
                  }}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40"
                >
                  Apply range
                </button>
              </div>
            </div>
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
