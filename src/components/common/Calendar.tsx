'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfDay, startOfMonth } from '@/lib/dates'

interface CalendarProps {
  /** Currently selected range while picking. */
  from: Date | null
  to: Date | null
  onPick: (date: Date) => void
  month?: Date
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** One month at a time. The parent decides whether a click sets from or to. */
export default function Calendar({ from, to, onPick, month }: CalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(month ?? from ?? new Date()))

  const first = startOfMonth(cursor)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const today = startOfDay(new Date())

  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)
    ),
  ]

  const isSame = (a: Date | null, b: Date) =>
    !!a && startOfDay(a).getTime() === startOfDay(b).getTime()

  const inBetween = (d: Date) => {
    if (!from || !to) return false
    const t = startOfDay(d).getTime()
    return t > startOfDay(from).getTime() && t < startOfDay(to).getTime()
  }

  return (
    <div className="w-64 select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-zinc-900">
          {cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[0.625rem] font-medium text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const selected = isSame(from, date) || isSame(to, date)
          const between = inBetween(date)
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onPick(date)}
              className={`h-8 rounded-md text-xs transition-colors ${
                selected
                  ? 'bg-zinc-900 font-semibold text-white'
                  : between
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-700 hover:bg-zinc-100'
              } ${isSame(today, date) && !selected ? 'font-semibold text-zinc-900 ring-1 ring-zinc-300 ring-inset' : ''}`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
