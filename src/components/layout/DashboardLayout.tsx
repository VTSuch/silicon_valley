'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import Dashboard from '../dashboard/Dashboard'
import Candidates from '../candidates/Candidates'
import Roles from '../roles/Roles'

export default function DashboardLayout() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'candidates':
        return <Candidates />
      case 'roles':
        return <Roles />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userEmail={user?.email || ''}
      />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  )
}
