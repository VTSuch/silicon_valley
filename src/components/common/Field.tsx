'use client'

export const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5'

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
