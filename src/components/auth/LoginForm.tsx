'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Mail, Lock } from 'lucide-react'

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
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

      if (!data.session) {
        setMessage('Cuenta creada. Revisa tu email para confirmar el acceso.')
      }

      setMode('login')
    } catch (error: any) {
      setError(error.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center space-x-2">
              <User className="h-8 w-8 text-brand-600" />
              <h1 className="text-3xl font-bold text-gray-900">Silicon Valley</h1>
            </div>
          </div>
          <p className="text-gray-600">Headhunting & Talent Management</p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
        >
          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Apellidos
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className="text-gray-700 text-sm text-center">{message}</div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'login'
                ? loading
                  ? 'Iniciando sesión...'
                  : 'Iniciar sesión'
                : loading
                  ? 'Creando cuenta...'
                  : 'Crear cuenta'}
            </button>
          </div>

          <div className="text-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setMessage('')
                }}
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Crear cuenta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                }}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
