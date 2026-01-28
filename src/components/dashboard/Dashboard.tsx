'use client'

import { useMemo, useState } from 'react'
import { useDashboard } from '@/hooks/useData'
import { Users, Briefcase, CheckCircle, Calendar, Send, Building } from 'lucide-react'
import { CandidateStatus } from '@/types'
import StatusFilterDropdown from '@/components/common/StatusFilterDropdown'

export default function Dashboard() {
  const { stats, rolesWithCandidateCount, candidates } = useDashboard()
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

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const filteredRecentCandidates = useMemo(() => {
    const filtered = statusFilter.length
      ? candidates.filter((c) => statusFilter.includes(c.status))
      : candidates
    return filtered.slice(0, 5)
  }, [candidates, statusFilter])

  const kpis = [
    { title: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'blue' },
    { title: 'Total Roles', value: stats.totalRoles, icon: Briefcase, color: 'green' },
    { title: 'Offers Accepted', value: stats.offersAccepted, icon: CheckCircle, color: 'purple' },
    { title: 'In Interview', value: stats.inInterview, icon: Calendar, color: 'orange' },
    { title: 'Sent to Client', value: stats.sentToClient, icon: Send, color: 'red' },
    { title: 'Sent to Agency', value: stats.sentToAgency, icon: Building, color: 'indigo' },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-brand-50', text: 'text-brand-700' },
      green: { bg: 'bg-green-50', text: 'text-green-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
      red: { bg: 'bg-red-50', text: 'text-red-600' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const colors = getColorClasses(kpi.color)
          return (
            <div key={kpi.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
          </div>
          <div className="overflow-hidden">
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
                    Bounty
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecentCandidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.role?.job_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.role?.bounty ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {formatStatus(candidate.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles with Candidate Count */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          </div>
          <div className="overflow-hidden">
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
                    Candidates
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rolesWithCandidateCount.slice(0, 5).map((role) => (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {role.job_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.candidateCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
