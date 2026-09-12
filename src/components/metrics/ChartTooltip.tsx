'use client'

import { useCallback, useRef, useState } from 'react'

export interface CursorPos {
  x: number
  y: number
}

/**
 * Tracks the cursor inside a chart so a tooltip can hang off it instead of
 * being pinned to a corner. Coordinates are relative to the returned ref.
 */
export function useCursorTooltip() {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CursorPos | null>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setPos({ x: e.clientX - box.left, y: e.clientY - box.top })
  }, [])

  const onMouseLeave = useCallback(() => setPos(null), [])

  return { ref, pos, onMouseMove, onMouseLeave }
}

/**
 * A panel anchored to the cursor, hanging down and to the left of it so it
 * never covers the bar being read. It flips to the right near the left edge
 * and is allowed to spill outside the chart — the card around it does not
 * clip, and a tooltip squeezed inside the plot is worse than one that overlaps
 * the page.
 */
export default function ChartTooltip({
  pos,
  width = 208,
  children,
}: {
  pos: CursorPos | null
  /** Panel width in px, used to decide which side of the cursor it opens on. */
  width?: number
  children: React.ReactNode
}) {
  if (!pos) return null
  const flip = pos.x < width + 16

  return (
    <div
      className="pointer-events-none absolute z-30 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
      style={{
        width,
        left: pos.x + (flip ? 12 : -12),
        top: pos.y + 12,
        transform: flip ? undefined : 'translateX(-100%)',
      }}
    >
      {children}
    </div>
  )
}
