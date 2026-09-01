'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { Role } from '@/types'

interface RoleComboboxProps {
  roles: Role[]
  value: string
  onChange: (roleId: string) => void
  /** When given, the list offers a "+ New role" entry. */
  onCreateNew?: () => void
  /** Offer an explicit "No role yet" entry that clears the selection. */
  allowNone?: boolean
  placeholder?: string
}

/**
 * Type-ahead role picker. A native <select> gets unusable once there are
 * dozens of roles, and it cannot be styled to match the rest of the app.
 */
export default function RoleCombobox({
  roles,
  value,
  onChange,
  onCreateNew,
  allowNone,
  placeholder = 'Search a role or company…',
}: RoleComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [lastQuery, setLastQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = roles.find((r) => r.id === value) ?? null

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) =>
        r.job_title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.location ?? '').toLowerCase().includes(q)
    )
  }, [roles, query])

  // A new search resets the highlight to the first match.
  if (query !== lastQuery) {
    setLastQuery(query)
    setHighlight(0)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (role: Role) => {
    onChange(role.id)
    setOpen(false)
    setQuery('')
  }

  const createNew = () => {
    setOpen(false)
    setQuery('')
    onCreateNew?.()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const total = matches.length + (onCreateNew ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % Math.max(1, total))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + Math.max(1, total)) % Math.max(1, total))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight < matches.length) pick(matches[highlight])
      else createNew()
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={ref} className="relative">
      {open ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full rounded-lg border border-zinc-400 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none ring-2 ring-zinc-900/5"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm outline-none transition hover:border-zinc-300 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
        >
          {selected ? (
            <span className="min-w-0 truncate text-zinc-900">
              {selected.job_title}
              <span className="text-zinc-400"> · {selected.company}</span>
            </span>
          ) : (
            <span className="text-zinc-400">
              {allowNone ? 'No role yet — looking for one' : placeholder}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        </button>
      )}

      {open && (
        <div className="sv-fade-in absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          {matches.map((role, i) => (
            <button
              key={role.id}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(role)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${
                i === highlight ? 'bg-zinc-100' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-zinc-900">{role.job_title}</span>
                <span className="block truncate text-xs text-zinc-400">
                  {role.company}
                  {role.location ? ` · ${role.location}` : ''}
                </span>
              </span>
              {role.id === value && <Check className="h-4 w-4 shrink-0 text-zinc-900" />}
            </button>
          ))}

          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
                setQuery('')
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                value === '' ? 'font-medium text-zinc-900' : 'text-zinc-600'
              } hover:bg-zinc-50`}
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-400" />
                No role yet — looking for one
              </span>
              {value === '' && <Check className="h-4 w-4 shrink-0 text-zinc-900" />}
            </button>
          )}

          {matches.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-zinc-400">
              No role matches “{query}”.
            </p>
          )}

          {onCreateNew && (
            <>
              {matches.length > 0 && <div className="my-1 h-px bg-zinc-100" />}
              <button
                type="button"
                onMouseEnter={() => setHighlight(matches.length)}
                onClick={createNew}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 ${
                  highlight === matches.length ? 'bg-zinc-100' : ''
                }`}
              >
                <Plus className="h-4 w-4 text-zinc-400" />
                New role
                {query.trim() && <span className="truncate text-zinc-400">“{query.trim()}”</span>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
