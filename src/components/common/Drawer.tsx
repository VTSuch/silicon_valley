'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  width?: string
}

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  width = 'sm:max-w-xl',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="sv-fade-in absolute inset-0 bg-zinc-900/20 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`sv-slide-in relative flex h-full w-full flex-col bg-white shadow-2xl ${width}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            {subtitle && <div className="text-xs font-medium text-zinc-500">{subtitle}</div>}
            <div className="truncate text-lg font-semibold text-zinc-900">{title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
