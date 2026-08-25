'use client'

import { statusMeta } from '@/lib/status'

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const meta = statusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${meta.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export function SourcePill({ source }: { source?: string }) {
  if (!source || source === 'empty') return <span className="text-zinc-300">—</span>
  const cls =
    source === 'Paraform'
      ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
      : source === 'Upnest'
        ? 'bg-teal-50 text-teal-700 ring-teal-600/20'
        : 'bg-zinc-100 text-zinc-600 ring-zinc-500/20'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {source}
    </span>
  )
}
