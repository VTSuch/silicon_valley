'use client'

import { useState } from 'react'
import { toDateInput } from '@/lib/dates'

interface DateInputProps {
  value: string | Date
  onChange: (next: string) => void
  className?: string
  /** Commit while typing instead of only on blur. */
  eager?: boolean
}

/**
 * A date field that survives half-typed input. A native <input type="date">
 * emits an empty string for every incomplete value, so writing that straight
 * back into state wipes what the user just typed. This keeps its own draft and
 * only reports complete, sane dates upstream.
 */
export default function DateInput({ value, onChange, className = '', eager }: DateInputProps) {
  const external = toDateInput(value)
  const [draft, setDraft] = useState(external)
  const [lastExternal, setLastExternal] = useState(external)
  const [focused, setFocused] = useState(false)

  // Adjust the draft when the value changes underneath us, but never while
  // the user is mid-edit. (React's "derive state during render" pattern.)
  if (external !== lastExternal) {
    setLastExternal(external)
    if (!focused) setDraft(external)
  }

  const commit = (next: string) => {
    if (!next) return
    const year = Number(next.slice(0, 4))
    // The browser reports 0001-… while the year is still being typed.
    if (!Number.isFinite(year) || year < 1900 || year > 2999) return
    if (next !== external) onChange(next)
  }

  return (
    <input
      type="date"
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value)
        if (eager) commit(e.target.value)
      }}
      onBlur={(e) => {
        setFocused(false)
        if (e.target.value) commit(e.target.value)
        else setDraft(external)
      }}
      className={className}
    />
  )
}
