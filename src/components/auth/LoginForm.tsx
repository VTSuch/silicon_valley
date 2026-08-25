'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Field, PrimaryButton, inputClass } from '@/components/common/Field'

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
            },
          },
        })
        if (error) throw error
        if (!data.session) setMessage('Account created. Check your email to confirm access.')
        setMode('login')
      }
    } catch (err) {
      setError(errorMessage(err, mode === 'login' ? 'Could not sign in' : 'Could not sign up'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            SV
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Silicon Valley</h1>
          <p className="text-sm text-zinc-500">Headhunting &amp; talent management</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Last name">
                <input
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
            </div>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          )}

          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </PrimaryButton>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setMessage('')
            }}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-900"
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
