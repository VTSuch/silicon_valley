'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CandidateStatus } from '@/types'
import { Filter } from 'lucide-react'

interface StatusFilterDropdownProps {
  value: CandidateStatus[]
  onChange: (next: CandidateStatus[]) => void
  options: CandidateStatus[]
}

export default function StatusFilterDropdown({ value, onChange, options }: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null
    return document.body
  }, [])

  const updatePosition = () => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setPos({
      top: rect.bottom + 8,
      left: rect.right,
      width: rect.width,
    })
  }

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const toggle = (status: CandidateStatus) => {
    if (value.includes(status)) {
      onChange(value.filter((s) => s !== status))
    } else {
      onChange([...value, status])
    }
  }

  const clear = () => onChange([])

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => {
          setOpen((v) => {
            const next = !v
            if (next) {
              updatePosition()
            }
            return next
          })
        }}
        className="ml-2 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
        {value.length ? (
          <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
            {value.length}
          </span>
        ) : null}
      </button>

      {open && portalTarget
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                transform: 'translateX(-100%)',
                zIndex: 1000,
              }}
              className="w-64 rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-700">Status</div>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-64 overflow-auto p-2">
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  {options.map((status, idx) => (
                    <label
                      key={status}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 ${
                        idx !== options.length - 1 ? 'border-b border-gray-200' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={value.includes(status)}
                        onChange={() => toggle(status)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-800">{formatStatus(status)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>,
            portalTarget
          )
        : null}
    </div>
  )
}
