'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ListFilter } from 'lucide-react'
import { CandidateStatus } from '@/types'
import { CLOSED_STATUSES, PIPELINE_STATUSES, statusMeta } from '@/lib/status'

interface Props {
  value: CandidateStatus[]
  onChange: (next: CandidateStatus[]) => void
}

export default function StatusFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = (s: CandidateStatus) =>
    onChange(value.includes(s) ? value.filter((v) => v !== s) : [...value, s])

  const group = (label: string, list: CandidateStatus[]) => (
    <div>
      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      {list.map((s) => {
        const meta = statusMeta(s)
        return (
          <label
            key={s}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={value.includes(s)}
              onChange={() => toggle(s)}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </label>
        )
      })}
    </div>
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          value.length
            ? 'border-zinc-900 bg-zinc-900 text-white'
            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
        }`}
      >
        <ListFilter className="h-3.5 w-3.5" />
        Stage
        {value.length > 0 && (
          <span className="rounded bg-white/20 px-1.5 text-xs">{value.length}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="sv-fade-in absolute left-0 z-40 mt-1 max-h-96 w-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          {group('Pipeline', PIPELINE_STATUSES)}
          {group('Closed', CLOSED_STATUSES)}
          {value.length > 0 && (
            <>
              <div className="my-1 h-px bg-zinc-100" />
              <button
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
