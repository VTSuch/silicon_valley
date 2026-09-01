'use client'

import { useEffect, useRef } from 'react'

const ITEM_H = 32
const VISIBLE = 5
const HEIGHT = ITEM_H * VISIBLE
const PAD = (HEIGHT - ITEM_H) / 2

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

interface ColumnProps {
  items: { value: number; label: string }[]
  selected: number
  onSelect: (value: number) => void
  width: string
}

function Column({ items, selected, onSelect, width }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Set while we scroll programmatically, so we ignore the echoed events. */
  const syncing = useRef(false)

  const index = Math.max(0, items.findIndex((i) => i.value === selected))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = index * ITEM_H
    if (Math.abs(el.scrollTop - target) < 2) return
    syncing.current = true
    el.scrollTo({ top: target, behavior: 'auto' })
    setTimeout(() => {
      syncing.current = false
    }, 50)
  }, [index])

  const onScroll = () => {
    if (syncing.current) return
    if (timer.current) clearTimeout(timer.current)
    // Wait for the scroll to settle, then snap to whatever sits in the band.
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const next = items[Math.round(el.scrollTop / ITEM_H)]
      if (next && next.value !== selected) onSelect(next.value)
    }, 120)
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{ height: HEIGHT, scrollSnapType: 'y mandatory' }}
      className={`${width} overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      <div style={{ height: PAD }} />
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelect(item.value)}
          style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
          className={`flex w-full items-center justify-center text-sm tabular-nums transition-colors ${
            item.value === selected ? 'font-semibold text-zinc-900' : 'text-zinc-400'
          }`}
        >
          {item.label}
        </button>
      ))}
      <div style={{ height: PAD }} />
    </div>
  )
}

interface DateWheelProps {
  label: string
  value: Date
  onChange: (next: Date) => void
  minYear?: number
  maxYear?: number
}

/** Day / month / year scroll wheels, the way a phone picks a date. */
export default function DateWheel({
  label,
  value,
  onChange,
  minYear = new Date().getFullYear() - 10,
  maxYear = new Date().getFullYear() + 5,
}: DateWheelProps) {
  const year = value.getFullYear()
  const month = value.getMonth()
  const day = value.getDate()

  const set = (y: number, m: number, d: number) => {
    // Keep the day valid when the month or year changes underneath it.
    onChange(new Date(y, m, Math.min(d, daysInMonth(y, m)), 12))
  }

  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
  }))
  const months = MONTHS.map((m, i) => ({ value: i, label: m }))
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: minYear + i,
    label: String(minYear + i),
  }))

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 text-xs font-medium text-zinc-600">{label}</div>
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {/* The band marking what is selected. */}
        <div
          style={{ top: PAD, height: ITEM_H }}
          className="pointer-events-none absolute inset-x-0 border-y border-zinc-200 bg-zinc-50"
        />
        <div className="relative flex">
          <Column
            items={days}
            selected={day}
            onSelect={(d) => set(year, month, d)}
            width="w-1/4"
          />
          <Column
            items={months}
            selected={month}
            onSelect={(m) => set(year, m, day)}
            width="w-1/3"
          />
          <Column
            items={years}
            selected={year}
            onSelect={(y) => set(y, month, day)}
            width="flex-1"
          />
        </div>
        {/* Fade the rows that scroll out of the band. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  )
}
