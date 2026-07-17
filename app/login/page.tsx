'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { createOsAuthBrowserClient } from '@/lib/os-auth-browser'

// Same credentials as Penfix OS — this signs in against the Penfix OS Supabase
// project (the accounts managed in jobs.penfixads.com's User Management), and
// the session cookie is shared across *.penfixads.com, so logging in here also
// signs you into the other Penfix apps and vice versa.
function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const urlError = searchParams.get('error')
  const urlErrorMessage =
    urlError === 'no-access' ? 'This account is not an active Penfix staff account. Contact an admin.' : ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createOsAuthBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setLoading(false); setError(authError.message); return }
    // Hard navigation so the middleware picks up the freshly-set session cookie
    window.location.href = next
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#4A0000' }}>Staff Sign In</h2>
          <p className="text-gray-600 text-sm">
            Use your Penfix OS email and password — the same account you use on jobs.penfixads.com.
          </p>
        </div>

        {urlErrorMessage && (
          <p className="text-sm text-center rounded-lg px-3 py-2 mb-4" style={{ color: '#4A0000', backgroundColor: '#F9EBD8' }}>
            {urlErrorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#4A0000' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@penfix.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#4A0000' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold rounded-lg py-2.5 mt-2 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#4A0000' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Forgot your password? Reset it from the Penfix OS login page at jobs.penfixads.com.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Employee Skills Assessment" />
      <Suspense>
        <LoginForm />
      </Suspense>
      <PenfixFooter />
    </div>
  )
}
