'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createOsAuthBrowserClient } from '@/lib/os-auth-browser'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/text'

// Same wordmark treatment (Cormorant Garamond + uppercase tracking) and chrome color
// as Penfix OS's sidebar (jobs.penfixads.com) — one shared visual identity across the
// *.penfixads.com apps. The "HR" tag is the only thing that tells staff which app of
// the suite they're in, since the SSO session carries across all of them.
//
// This stays a client component (some pages that render it — app/admin/page.tsx,
// app/admin/assess/page.tsx — are themselves client components, and a Client
// Component can't render an async Server Component directly). So the logged-in
// name is resolved with a small client-side lookup mirroring
// lib/employee-session.ts's getCurrentEmployee, rather than reusing it server-side.
export default function PenfixHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === '/'
  const [displayName, setDisplayName] = useState<string | null>(null)

  // Cookie is scoped to .penfixads.com (lib/cookie-domain.ts), so this signs the
  // user out of every Penfix app sharing the SSO session (payroll, attendance,
  // Penfix OS itself), not just hr — same signOut() call payroll's own Sidebar
  // uses, but payroll's cookie is host-scoped there so its sign-out stays local
  // to payroll only (see payroll/lib/os-auth-browser.ts's own comment).
  async function handleSignOut() {
    await createOsAuthBrowserClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await createOsAuthBrowserClient().auth.getUser()
      if (!user?.email || cancelled) return
      const { data } = await supabase
        .from('employees')
        .select('full_name')
        .ilike('email', user.email)
        .maybeSingle()
      if (cancelled) return
      // full_name falls back to the login email when there's no matching employee
      // row — skip the badge rather than show a raw email.
      const name = (data as { full_name?: string } | null)?.full_name
      setDisplayName(name ? titleCase(name) : null)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <header style={{ backgroundColor: '#4A0000' }} className="relative text-white shadow-lg">
      {!isHome && (
        <Link
          href="/" title="Home"
          className="absolute top-3 left-4 sm:top-4 sm:left-6 p-1.5 rounded-lg transition hover:opacity-80"
          style={{ border: '1px solid #C9A84C' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9BB6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
          </svg>
        </Link>
      )}
      {displayName && (
        <div
          className="hidden sm:flex items-center gap-3 absolute top-4 right-6 text-xs"
          style={{ color: '#D9BB6E' }}
        >
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="font-medium">{displayName}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="font-semibold uppercase tracking-wide rounded border px-2 py-1 transition hover:bg-white/10"
            style={{ borderColor: 'rgba(201,168,76,0.4)', fontSize: '0.65rem' }}
          >
            Sign Out
          </button>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/noback.png" alt="Penfix Logo" className="h-12 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-semibold uppercase"
                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", serif', color: '#C9A84C', letterSpacing: '0.18em' }}
              >
                Penfix
              </h1>
              <span
                className="text-[0.65rem] font-semibold uppercase rounded border px-1.5 py-0.5"
                style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.4)', letterSpacing: '0.18em' }}
              >
                HR
              </span>
            </div>
          </div>
        </div>
        {subtitle && (
          <p className="text-sm mt-1 text-white/90">{subtitle}</p>
        )}
      </div>
    </header>
  )
}
