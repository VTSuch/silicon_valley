'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CandidateWithRole } from '@/types'
import { User, Building } from 'lucide-react'

interface CandidateCardProps {
  candidate: CandidateWithRole
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start space-x-3">
        <User className="h-5 w-5 text-gray-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {candidate.full_name}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {candidate.role?.job_title}
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-1">
            <Building className="h-3 w-3 mr-1" />
            {candidate.role?.company}
          </div>
        </div>
      </div>
    </div>
  )
}
