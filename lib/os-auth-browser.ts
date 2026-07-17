import { createBrowserClient } from '@supabase/ssr'
import { getCookieDomain } from '@/lib/cookie-domain'

// Auth client for the PENFIX OS Supabase project (not this app's own project) —
// the HR portal signs people in against the same auth users that Penfix OS's
// User Management maintains, so staff use one set of credentials everywhere.
// Cookies are scoped to .penfixads.com (see lib/cookie-domain.ts), so someone
// already signed into jobs.penfixads.com is automatically signed in here too.
export function createOsAuthBrowserClient() {
  const cookieDomain = typeof window !== 'undefined' ? getCookieDomain(window.location.host) : undefined
  return createBrowserClient(
    process.env.NEXT_PUBLIC_OS_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_OS_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
  )
}
