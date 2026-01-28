'use client'

import { useMemo, useState } from 'react'
import { useRoles } from '@/hooks/useData'
import { Role } from '@/types'
import { Briefcase, Building, Calendar } from 'lucide-react'
import RoleDetailModal from './RoleDetailModal'

export default function Roles() {
  const { roles, loading } = useRoles()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openRole = (role: Role) => {
    setSelectedRole(role)
    setIsModalOpen(true)
  }

  const rows = useMemo(() => roles, [roles])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">Loading roles...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Work Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bounty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((role) => {
              const salaryText =
                role.salary_min || role.salary_max
                  ? `${role.salary_min ?? '—'} - ${role.salary_max ?? '—'}`
                  : '—'

              return (
                <tr
                  key={role.id}
                  onClick={() => openRole(role)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{role.job_title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-2" />
                      {role.company}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.work_mode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salaryText}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.bounty ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{role.description || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(role.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          </table>
        </div>
      </div>

      <RoleDetailModal
        role={selectedRole}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
