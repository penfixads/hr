import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCookieDomain } from '@/lib/cookie-domain'

// Checks the caller's role on the shared Penfix OS account (same mechanism as
// middleware.ts's /admin gate) — one login, one role, everywhere, no separate
// admin password. Used by API routes that perform privileged writes.
export async function getAdminSession() {
  const cookieStore = await cookies()
  const cookieDomain = getCookieDomain((await headers()).get('host'))
  const osSupabase = createServerClient(
    process.env.NEXT_PUBLIC_OS_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_OS_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await osSupabase.auth.getUser()
  if (!user?.email) return null
  const { data } = await osSupabase.from('users').select('role, name').eq('user_email', user.email).single()
  if (data?.role !== 'Admin') return null
  return { email: user.email, name: data.name as string }
}
