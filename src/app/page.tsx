'use client'

import { useAuth } from '@/hooks/useAuth'
import LoginForm from '@/components/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <DashboardLayout />
}
