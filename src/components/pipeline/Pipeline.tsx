'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { AlertTriangle, Check, Search } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useJourneys } from '@/hooks/useData'
import { useUI } from '@/context/UIContext'
import { Journey } from '@/lib/journey'
import { BOARD_COLUMNS, BoardColumn, midStep, rejectionFor, statusMeta } from '@/lib/status'
import { relativeAgo, relativeDays, toDateInput, fromDateInput } from '@/lib/dates'
import DateInput from '@/components/common/DateInput'

export default function Pipeline() {
  const journeys = useJourneys()
  const { setStatus } = useData()
  const { openCandidate } = useUI()
  const [dragging, setDragging] = useState<Journey | null>(null)
  const [query, setQuery] = useState('')
  const [moveDate, setMoveDate] = useState(() => toDateInput(new Date()))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase()
    const visible = journeys.filter((j) => {
      if (!BOARD_COLUMNS.some((c) => c.statuses.includes(j.status))) return false
      if (!q) return true
      return (
        j.candidate.full_name.toLowerCase().includes(q) ||
        (j.candidate.role?.company ?? '').toLowerCase().includes(q) ||
        (j.candidate.role?.job_title ?? '').toLowerCase().includes(q)
      )
    })
    return BOARD_COLUMNS.map((column) => ({
      column,
      items: visible
        .filter((j) => column.statuses.includes(j.status))
        .sort((a, b) => b.daysInStatus - a.daysInStatus),
    }))
  }, [journeys, query])

  const onDragEnd = async (event: DragEndEvent) => {
    setDragging(null)
    const columnId = event.over?.id as string | undefined
    const id = event.active.id as string
    if (!columnId) return
    const column = BOARD_COLUMNS.find((c) => c.id === columnId)
    const journey = journeys.find((j) => j.candidate.id === id)
    if (!column || !journey) return
    // Dropping into the column a card already sits in is a no-op — moving
    // between mid steps happens in the candidate panel.
    if (column.statuses.includes(journey.status)) return
    const target = column.id === 'lost' ? rejectionFor(journey.status) : column.entry
    await setStatus(id, target, fromDateInput(moveDate))
  }

  const onDragStart = (event: DragStartEvent) => {
    setDragging(journeys.find((j) => j.candidate.id === event.active.id) ?? null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Pipeline</h1>
          <p className="text-sm text-zinc-500">
            Drag a card to move a stage — the date below is what gets recorded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-48 rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400"
            />
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
            Moves dated
            <DateInput
              eager
              value={moveDate}
              onChange={setMoveDate}
              className="text-xs font-medium text-zinc-900 outline-none"
            />
          </label>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => (
            <Column
              key={col.column.id}
              column={col.column}
              items={col.items}
              onOpen={openCandidate}
            />
          ))}
        </div>

        <DragOverlay>
          {dragging ? (
            <div className="w-64 rotate-2 rounded-xl border border-zinc-300 bg-white p-3 shadow-xl">
              <div className="text-sm font-medium text-zinc-900">
                {dragging.candidate.full_name}
              </div>
              <div className="text-xs text-zinc-500">{dragging.candidate.role?.company}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function Column({
  column,
  items,
  onOpen,
}: {
  column: BoardColumn
  items: Journey[]
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const value = items.reduce((sum, j) => sum + j.bounty, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-200 bg-zinc-100/60'
      }`}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={`h-2 w-2 rounded-full ${column.color}`} />
        <span className="text-sm font-medium text-zinc-800">{column.label}</span>
        <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-xs font-medium text-zinc-500">
          {items.length}
        </span>
      </div>
      {value > 0 && (
        <div className="px-3 pb-2 text-[0.6875rem] tabular-nums text-zinc-400">
          ${value.toLocaleString()} in play
        </div>
      )}

      <div className="flex max-h-[calc(100vh-16rem)] min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
        {items.map((j) => (
          <Card key={j.candidate.id} journey={j} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function Card({ journey, onOpen }: { journey: Journey; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: journey.candidate.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(journey.candidate.id)}
      className={`cursor-grab rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-zinc-300 hover:shadow ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="truncate text-sm font-medium text-zinc-900">
        {journey.candidate.full_name}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
          {journey.candidate.role?.job_title}
        </span>
        {midStep(journey.status) > 0 && (
          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-700">
            Mid {midStep(journey.status)}
          </span>
        )}
        {statusMeta(journey.status).group === 'lost' && (
          <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-red-700">
            {statusMeta(journey.status).short}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 text-[0.6875rem] ${
            journey.stale
              ? journey.daysSinceFollowUp !== null
                ? 'font-medium text-emerald-600'
                : 'font-medium text-amber-600'
              : 'text-zinc-400'
          }`}
          title={
            journey.daysSinceFollowUp !== null
              ? `Followed up ${relativeAgo(journey.daysSinceFollowUp)}`
              : undefined
          }
        >
          {journey.stale &&
            (journey.daysSinceFollowUp !== null ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            ))}
          {relativeDays(journey.daysInStatus)}
        </span>
        {journey.bounty > 0 && (
          <span className="text-[0.6875rem] tabular-nums text-zinc-500">
            ${journey.bounty.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
