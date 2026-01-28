'use client'

import { useState } from 'react'
import { useCandidates, useRoles } from '@/hooks/useData'
import { Plus, User, Building, Mail, ExternalLink } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'
import { CandidateStatus } from '@/types'
import StatusFilterDropdown from '@/components/common/StatusFilterDropdown'

export default function Candidates() {
  const { candidates, loading } = useCandidates()
  const { roles } = useRoles()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<CandidateStatus[]>([])

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      cv_rejected: 'bg-red-100 text-red-800',
      sent_to_agency: 'bg-brand-100 text-brand-800',
      sent_to_client: 'bg-green-100 text-green-800',
      first_interview: 'bg-yellow-100 text-yellow-800',
      second_interview: 'bg-orange-100 text-orange-800',
      third_interview: 'bg-purple-100 text-purple-800',
      fourth_interview: 'bg-pink-100 text-pink-800',
      final_interview: 'bg-indigo-100 text-indigo-800',
      client_rejected: 'bg-red-100 text-red-800',
      offer_accepted: 'bg-green-100 text-green-800',
      candidate_quit: 'bg-gray-100 text-gray-800',
      standby: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const filteredCandidates = statusFilter.length
    ? candidates.filter((c) => statusFilter.includes(c.status))
    : candidates

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">Loading candidates...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Candidate
        </button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600">Use the Status header filter to narrow results.</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <span>Status</span>
                  <StatusFilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={candidateStatuses}
                  />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCandidates.map((candidate) => (
              <tr key={candidate.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {candidate.full_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {candidate.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {candidate.role?.job_title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    {candidate.role?.company}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                    {formatStatus(candidate.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(candidate.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 hover:text-brand-800 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddCandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roles={roles}
      />
    </div>
  )
}
