'use client'

import { useEffect, useState } from 'react'
import { CandidateStatus, CandidateWithRole, Role } from '@/types'
import { X, User, Mail, Briefcase } from 'lucide-react'

interface EditCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: CandidateWithRole | null
  roles: Role[]
  onSave: (candidateId: string, updates: { full_name: string; email: string; role_id: string; status: CandidateStatus }) => Promise<void>
}

const candidateStatuses: CandidateStatus[] = [
  'cv_rejected',
  'sent_to_agency',
  'sent_to_client',
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
]

export default function EditCandidateModal({ isOpen, onClose, candidate, roles, onSave }: EditCandidateModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role_id: '',
    status: 'cv_rejected' as CandidateStatus,
  })

  useEffect(() => {
    if (!candidate) return
    setFormData({
      full_name: candidate.full_name,
      email: candidate.email,
      role_id: candidate.role_id,
      status: candidate.status,
    })
  }, [candidate])

  if (!isOpen || !candidate) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(candidate.id, {
        full_name: formData.full_name,
        email: formData.email,
        role_id: formData.role_id,
        status: formData.status,
      })
      onClose()
    } catch (error) {
      console.error('Error updating candidate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white sm:bg-gray-50/50 sm:backdrop-blur-[2px] flex items-stretch sm:items-center justify-center z-50">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-lg p-6 sm:max-w-md overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                required
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="" disabled>
                  Select a role
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.job_title} — {role.company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CandidateStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
            >
              {candidateStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
