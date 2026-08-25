'use client'

import { useAuth } from '@/hooks/useAuth'
import LoginForm from '@/components/auth/LoginForm'
import AppShell from '@/components/layout/AppShell'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-400">Loading…</div>
      </div>
    )
  }

  if (!user) return <LoginForm />

  return <AppShell />
}
