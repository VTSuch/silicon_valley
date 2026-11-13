'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface MultiOption {
  value: string
  label: string
  /** Shown faded on the right, e.g. how many rows match. */
  count?: number
}

/**
 * A dropdown with checkboxes, styled like the rest of the site. Sized to its label, not the row.
 * An empty selection means "no filter": everything shows.
 */
export default function MultiSelect({
  label,
  icon,
  options,
  value,
  onChange,
  align = 'left',
}: {
  label: string
  icon?: React.ReactNode
  options: MultiOption[]
  value: string[]
  onChange: (next: string[]) => void
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          value.length
            ? 'border-zinc-900 bg-zinc-900 text-white'
            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
        }`}
      >
        {icon}
        {label}
        {value.length > 0 && <span className="rounded bg-white/20 px-1.5 text-xs">{value.length}</span>}
        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`sv-fade-in absolute z-40 mt-1 max-h-80 min-w-[12rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.length === 0 && <div className="px-2 py-2 text-xs text-zinc-400">Nothing to filter yet.</div>}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span className="whitespace-nowrap">{o.label}</span>
              {o.count !== undefined && (
                <span className="ml-auto pl-3 text-xs tabular-nums text-zinc-400">{o.count}</span>
              )}
            </label>
          ))}
          {value.length > 0 && (
            <>
              <div className="my-1 h-px bg-zinc-100" />
              <button
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
