'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const next = session?.user ?? null
        // Focusing the tab re-validates the session and hands back an equal
        // but brand-new user object. Keep the old reference so nothing
        // downstream re-renders for a change that did not happen.
        setUser((prev) => (prev?.id === next?.id ? prev : next))
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
