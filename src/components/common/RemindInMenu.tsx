'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, ChevronDown } from 'lucide-react'
import { addDays, addMonths } from '@/lib/dates'

const NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1)
const MENU_WIDTH = 224
const MENU_HEIGHT = 112

interface RemindInMenuProps {
  onPick: (until: Date) => void
  label?: string
  className?: string
  disabled?: boolean
}

/**
 * "Remind in [n] [weeks|months]".
 *
 * The menu renders in a portal: its triggers sit inside scrolling cards, and
 * an absolutely positioned panel would be clipped by their overflow.
 */
export default function RemindInMenu({
  onPick,
  label = 'Remind in',
  className = '',
  disabled,
}: RemindInMenuProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(2)
  const [unit, setUnit] = useState<'weeks' | 'months'>('weeks')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom
    // Flip above the trigger when there is not enough room underneath.
    const top = below < MENU_HEIGHT + 12 ? rect.top - MENU_HEIGHT - 6 : rect.bottom + 6
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - MENU_WIDTH - 8)
    setPos({ top: Math.max(8, top), left })
  }

  useEffect(() => {
    if (!open) return

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const reposition = () => place()

    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  const apply = () => {
    const until = unit === 'weeks' ? addDays(new Date(), amount * 7) : addMonths(new Date(), amount)
    onPick(until)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) place()
          setOpen((v) => !v)
        }}
        className={`inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 ${className}`}
      >
        <CalendarClock className="h-3 w-3" />
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="sv-fade-in z-[60] rounded-xl border border-zinc-200 bg-white p-2.5 shadow-lg"
          >
            <div className="mb-2 flex gap-1.5">
              <select
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              >
                {NUMBERS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'weeks' | 'months')}
                className="flex-[2] rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              >
                <option value="weeks">{amount === 1 ? 'week' : 'weeks'}</option>
                <option value="months">{amount === 1 ? 'month' : 'months'}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={apply}
              className="w-full rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
            >
              Remind me then
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
