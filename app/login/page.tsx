'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createOsAuthBrowserClient } from '@/lib/os-auth-browser'

const linkBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#7A1828', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }

const IconLogin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
  </svg>
)

// Same login layout as Penfix OS (jobs.penfixads.com) — background art, floating card,
// underline .pf-input fields — reused across the *.penfixads.com apps that sit behind
// this SSO, varying only the app name. Signs in against the Penfix OS Supabase project
// (the accounts managed in jobs.penfixads.com's User Management), and the session cookie
// is shared across *.penfixads.com, so logging in here also signs you into the other
// Penfix apps and vice versa — password reset stays on the OS login page rather than
// duplicating that flow here.
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
  const [showPassword, setShowPassword] = useState(false)

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
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/backgroundpenfix.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 400,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/penfix-logo.png" alt="Penfix" width={80} height={80} style={{ objectFit: 'contain', display: 'block', margin: '0 auto' }} />
          <h1 style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", serif', fontWeight: 600, color: '#7A1828', fontSize: '1.4rem', marginTop: '0.75rem', marginBottom: '0.25rem' }}>Penfix HR</h1>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Sign in to continue</p>
        </div>

        {urlErrorMessage && (
          <p style={{ color: '#7A1828', background: '#F9EBD8', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
            {urlErrorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="pf-label">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@penfix.com"
              className="pf-input"
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label className="pf-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pf-input"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#888', lineHeight: 1 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <a href="https://jobs.penfixads.com/login" style={linkBtnStyle}>
              Forgot password?
            </a>
          </div>

          {error && (
            <p style={{ color: '#c00', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="pf-btn pf-btn-block">
            <IconLogin />{loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#aaa' }}>
          Penfix Advertising &amp; Business Solutions
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
