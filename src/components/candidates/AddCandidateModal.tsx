'use client'

import { useState } from 'react'
import { useCandidates } from '@/hooks/useData'
import { Role, CandidateStatus } from '@/types'
import { X, User, Mail, ExternalLink, Briefcase } from 'lucide-react'
import AddRoleModal from '@/components/roles/AddRoleModal'

interface AddCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
}

const candidateStatuses: CandidateStatus[] = [
  'cv_rejected',
  'submitted',
  'first_interview',
  'second_interview',
  'third_interview',
  'fourth_interview',
  'final_interview',
  'client_rejected',
  'offer_accepted',
  'candidate_quit',
  'standby',
  'to_be_called',
]

export default function AddCandidateModal({ isOpen, onClose, roles }: AddCandidateModalProps) {
  const { createCandidate } = useCandidates()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    linkedin_url: '',
    role_id: '',
    status: 'cv_rejected' as CandidateStatus,
  })
  
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [pendingRoleSelection, setPendingRoleSelection] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createCandidate(formData)
      onClose()
      setFormData({
        full_name: '',
        email: '',
        linkedin_url: '',
        role_id: '',
        status: 'cv_rejected',
      })
    } catch (error) {
      console.error('Error creating candidate:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleModalClose = () => {
    setShowRoleModal(false)
    setPendingRoleSelection(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-white sm:bg-gray-50/50 sm:backdrop-blur-[2px] flex items-stretch sm:items-center justify-center z-50">
        <div className="bg-white w-full h-full sm:h-auto sm:rounded-lg p-6 sm:max-w-md overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Candidate</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      setPendingRoleSelection(true)
                      setShowRoleModal(true)
                    } else {
                      setFormData({ ...formData, role_id: e.target.value })
                    }
                  }}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.job_title} - {role.company}
                    </option>
                  ))}
                  <option value="new">+ Add new role</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CandidateStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              >
                {candidateStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Candidate'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Role Modal */}
      {showRoleModal && (
        <AddRoleModal
          isOpen={showRoleModal}
          onClose={handleRoleModalClose}
          onCreated={(role: any) => {
            if (pendingRoleSelection) {
              setFormData((prev) => ({ ...prev, role_id: role.id }))
            }
          }}
        />
      )}
    </>
  )
}
