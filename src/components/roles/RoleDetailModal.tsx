'use client'

import { Role } from '@/types'
import { X, Briefcase, Building, MapPin, DollarSign, Award, FileText, ListChecks } from 'lucide-react'

interface RoleDetailModalProps {
  role: Role | null
  isOpen: boolean
  onClose: () => void
}

export default function RoleDetailModal({ role, isOpen, onClose }: RoleDetailModalProps) {
  if (!isOpen || !role) return null

  const salaryText =
    role.salary_min || role.salary_max
      ? `${role.salary_min ?? '—'} - ${role.salary_max ?? '—'}`
      : '—'

  const workModeLabel: Record<string, string> = {
    remote: 'Remote',
    onsite: 'Onsite',
    hybrid: 'Hybrid',
  }

  return (
    <div className="fixed inset-0 bg-white sm:bg-gray-50/50 sm:backdrop-blur-[2px] flex items-stretch sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-lg sm:max-w-2xl sm:max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">Role</div>
            <h2 className="text-xl font-semibold text-gray-900 truncate">{role.job_title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <Building className="h-4 w-4 mr-2" />
                Company
              </div>
              <div className="text-gray-900 font-medium">{role.company}</div>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <MapPin className="h-4 w-4 mr-2" />
                Work mode
              </div>
              <div className="text-gray-900 font-medium">{workModeLabel[role.work_mode] ?? role.work_mode}</div>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <DollarSign className="h-4 w-4 mr-2" />
                Salary range
              </div>
              <div className="text-gray-900 font-medium">{salaryText}</div>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <Award className="h-4 w-4 mr-2" />
                Bounty
              </div>
              <div className="text-gray-900 font-medium">{role.bounty ?? '—'}</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <FileText className="h-4 w-4 mr-2" />
              Description
            </div>
            <div className="text-gray-900 whitespace-pre-wrap">{role.description || '—'}</div>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <ListChecks className="h-4 w-4 mr-2" />
              Requirements
            </div>
            <div className="text-gray-900 whitespace-pre-wrap">{role.requirements || '—'}</div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
