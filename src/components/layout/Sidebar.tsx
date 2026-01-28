'use client'

import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  LogOut, 
  Mail 
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userEmail: string
}

export default function Sidebar({ activeTab, onTabChange, userEmail }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'candidates', name: 'Candidates', icon: Users },
    { id: 'roles', name: 'Roles', icon: Briefcase },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 md:h-screen flex flex-col">
      <div className="p-4 md:p-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Silicon Valley</h1>
        </div>
      </div>

      <nav className="flex-1 px-2 md:px-4">
        <div className="flex md:block gap-1 md:space-y-1 overflow-x-auto md:overflow-visible px-2 md:px-0 pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`shrink-0 md:w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-3 px-3">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate">{userEmail}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
