'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  size?: string
}

export default function Modal({ open, onClose, title, children, size = 'sm:max-w-lg' }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div className="sv-fade-in absolute inset-0 bg-zinc-900/20 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`sv-fade-in relative flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl ${size}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
