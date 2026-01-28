'use client'

import { useState } from 'react'
import { useCandidates, useRoles } from '@/hooks/useData'
import { Role, CandidateStatus } from '@/types'
import { X, Plus, User, Mail, ExternalLink, Briefcase } from 'lucide-react'

interface AddCandidateModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
}

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

export default function AddCandidateModal({ isOpen, onClose, roles }: AddCandidateModalProps) {
  const { createCandidate } = useCandidates()
  const { createRole } = useRoles()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    linkedin_url: '',
    role_id: '',
    status: 'cv_rejected' as CandidateStatus,
  })
  
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState({
    job_title: '',
    company: '',
    salary_min: '',
    salary_max: '',
    work_mode: 'remote' as const,
    description: '',
    requirements: '',
    bounty: '',
  })
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

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const role = await createRole({
        job_title: newRole.job_title,
        company: newRole.company,
        salary_min: newRole.salary_min ? parseInt(newRole.salary_min) : undefined,
        salary_max: newRole.salary_max ? parseInt(newRole.salary_max) : undefined,
        work_mode: newRole.work_mode,
        description: newRole.description || undefined,
        requirements: newRole.requirements || undefined,
        bounty: newRole.bounty ? parseInt(newRole.bounty) : undefined,
      })

      setFormData(prev => ({ ...prev, role_id: role.id }))
      setShowRoleModal(false)
      setNewRole({
        job_title: '',
        company: '',
        salary_min: '',
        salary_max: '',
        work_mode: 'remote',
        description: '',
        requirements: '',
        bounty: '',
      })
    } catch (error) {
      console.error('Error creating role:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Role</h2>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={newRole.job_title}
                  onChange={(e) => setNewRole({ ...newRole, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  required
                  value={newRole.company}
                  onChange={(e) => setNewRole({ ...newRole, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Min
                  </label>
                  <input
                    type="number"
                    value={newRole.salary_min}
                    onChange={(e) => setNewRole({ ...newRole, salary_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Max
                  </label>
                  <input
                    type="number"
                    value={newRole.salary_max}
                    onChange={(e) => setNewRole({ ...newRole, salary_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Mode
                </label>
                <select
                  value={newRole.work_mode}
                  onChange={(e) => setNewRole({ ...newRole, work_mode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  value={newRole.requirements}
                  onChange={(e) => setNewRole({ ...newRole, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bounty
                </label>
                <input
                  type="number"
                  value={newRole.bounty}
                  onChange={(e) => setNewRole({ ...newRole, bounty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
