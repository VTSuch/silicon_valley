'use client'

import { useMemo, useState } from 'react'
import { useDashboard } from '@/hooks/useData'
import { Users, Briefcase, CheckCircle, Calendar, Send, Building, Phone, DollarSign } from 'lucide-react'
import { CandidateStatus } from '@/types'
import StatusFilterDropdown from '@/components/common/StatusFilterDropdown'

export default function Dashboard() {
  const { stats, rolesWithCandidateCount, candidates } = useDashboard()
  const [statusFilter, setStatusFilter] = useState<CandidateStatus[]>([])

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      cv_rejected: 'bg-red-100 text-red-800',
      submitted: 'bg-green-100 text-green-800',
      first_interview: 'bg-yellow-100 text-yellow-800',
      second_interview: 'bg-orange-100 text-orange-800',
      third_interview: 'bg-purple-100 text-purple-800',
      fourth_interview: 'bg-pink-100 text-pink-800',
      final_interview: 'bg-indigo-100 text-indigo-800',
      client_rejected: 'bg-red-100 text-red-800',
      offer_accepted: 'bg-green-100 text-green-800',
      candidate_quit: 'bg-gray-100 text-gray-800',
      standby: 'bg-gray-100 text-gray-800',
      to_be_called: 'bg-blue-100 text-blue-800',
    }

    if (status === 'sent_to_agency' || status === 'sent_to_client') {
      return colors.submitted
    }

    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatStatus = (status: string) => {
    if (status === 'sent_to_agency' || status === 'sent_to_client') return 'Submitted'
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getRowTint = (source?: string) => {
    if (source === 'Paraform') return 'bg-purple-50'
    return ''
  }

  const activeCandidates = useMemo(() => {
    const activeStatuses = [
      'submitted',
      'first_interview',
      'second_interview',
      'third_interview',
      'fourth_interview',
      'final_interview',
      'to_be_called',
    ]
    const filtered = statusFilter.length
      ? candidates.filter((c) => statusFilter.includes(c.status))
      : candidates
    return filtered.filter((c) => activeStatuses.includes(c.status)).slice(0, 10)
  }, [candidates, statusFilter])

  const kpis = [
    { title: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'blue' },
    { title: 'Total Roles', value: stats.totalRoles, icon: Briefcase, color: 'green' },
    { title: 'In Interview', value: stats.inInterview, icon: Calendar, color: 'orange' },
    { title: 'Pipeline Bounty', value: `$${stats.pipelineBounty.toLocaleString()}`, icon: DollarSign, color: 'green' },
    { title: 'Submitted', value: stats.submitted, icon: Send, color: 'red' },
    { title: 'To be Called', value: stats.toBeCalled, icon: Phone, color: 'cyan' },
    { title: 'KPI_PLACEHOLDER', value: '', icon: Users, color: 'blue' },
    { title: 'Offers Accepted', value: stats.offersAccepted, icon: CheckCircle, color: 'green' },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-brand-50', text: 'text-brand-700' },
      green: { bg: 'bg-green-50', text: 'text-green-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
      red: { bg: 'bg-red-50', text: 'text-red-600' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          className="hidden md:block absolute top-0 bottom-0 w-px bg-gray-200"
          style={{ left: 'calc(75% + 0.25rem)' }}
        />
        {kpis.map((kpi) => {
          if (kpi.title === 'KPI_PLACEHOLDER') {
            return <div key={kpi.title} />
          }

          const Icon = kpi.icon
          const colors = getColorClasses(kpi.color)
          return (
            <div key={kpi.title} className={`bg-white rounded-lg shadow p-4 ${kpi.title === 'Pipeline Bounty' ? 'ring-2 ring-green-700 ring-opacity-60 shadow-lg shadow-green-200' : ''}`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Active Candidates */}
        <div className="bg-white rounded-lg shadow col-span-3">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Candidates</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-32 pl-6 pr-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    Name
                  </th>
                  <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    Role
                  </th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    Bounty
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
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
                {activeCandidates.map((candidate) => (
                  <tr key={candidate.id} className={getRowTint(candidate.role?.source)}>
                    <td className="w-32 pl-6 pr-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">
                      {candidate.full_name}
                    </td>
                    <td className="w-24 px-2 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                      {candidate.role?.job_title}
                    </td>
                    <td className="w-20 px-2 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                      {candidate.role?.bounty ?? '—'}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
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
        <div className="bg-white rounded-lg shadow col-span-2">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-28 pl-6 pr-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    Job Title
                  </th>
                  <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    Company
                  </th>
                  <th className="w-12 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    NUM.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rolesWithCandidateCount.slice(0, 10).map((role) => (
                  <tr key={role.id} className={getRowTint(role.source)}>
                    <td className="w-28 pl-6 pr-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">
                      {role.job_title}
                    </td>
                    <td className="w-24 px-2 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                      {role.company}
                    </td>
                    <td className="w-12 px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center truncate">
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
