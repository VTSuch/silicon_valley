'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, 
  closestCenter, DragOverlay, useSensor, useSensors, 
  PointerSensor } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCandidates } from '@/hooks/useData'
import { CandidateStatus, CandidateWithRole } from '@/types'
import { Building, User } from 'lucide-react'
import CandidateCard from './CandidateCard'

const candidateStatuses: CandidateStatus[] = [
  'cv_rejected',
  'sent_to_agency',
  'sent_to_client',
  'first_interview',
  'second_interview',
  'third_interview',
  'fourth_interview',
  'final_interview',
  'client_rejected',
  'offer_accepted',
  'candidate_quit',
  'standby',
]

const getStatusColor = (status: CandidateStatus) => {
  const colors: Record<CandidateStatus, string> = {
    cv_rejected: 'bg-red-50 border-red-200',
    sent_to_agency: 'bg-brand-50 border-brand-200',
    sent_to_client: 'bg-green-50 border-green-200',
    first_interview: 'bg-yellow-50 border-yellow-200',
    second_interview: 'bg-orange-50 border-orange-200',
    third_interview: 'bg-purple-50 border-purple-200',
    fourth_interview: 'bg-pink-50 border-pink-200',
    final_interview: 'bg-indigo-50 border-indigo-200',
    client_rejected: 'bg-red-50 border-red-200',
    offer_accepted: 'bg-green-50 border-green-200',
    candidate_quit: 'bg-gray-50 border-gray-200',
    standby: 'bg-gray-50 border-gray-200',
  }
  return colors[status]
}

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function Pipeline() {
  const { candidates, updateCandidateStatus } = useCandidates()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const candidatesByStatus = candidateStatuses.reduce((acc, status) => {
    acc[status] = candidates.filter(c => c.status === status)
    return acc
  }, {} as Record<CandidateStatus, CandidateWithRole[]>)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const candidateId = active.id as string
    const newStatus = over.id as CandidateStatus

    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate || candidate.status === newStatus) return

    try {
      await updateCandidateStatus(candidateId, newStatus)
    } catch (error) {
      console.error('Error updating candidate status:', error)
    }

    setActiveId(null)
  }

  const activeCandidate = candidates.find(c => c.id === activeId)

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Pipeline</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {candidateStatuses.map((status) => (
            <div key={status} className={`min-h-[400px] ${getStatusColor(status)} border rounded-lg p-4`}>
              <h3 className="font-semibold text-gray-900 mb-4">
                {formatStatus(status)}
                <span className="ml-2 text-sm text-gray-500">
                  ({candidatesByStatus[status].length})
                </span>
              </h3>
              
              <SortableContext
                id={status}
                items={candidatesByStatus[status].map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[300px]">
                  {candidatesByStatus[status].map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeCandidate ? (
            <div className="bg-white border rounded-lg p-4 shadow-lg opacity-90">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">
                    {activeCandidate.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activeCandidate.role?.job_title}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
