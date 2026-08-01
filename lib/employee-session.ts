import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookieDomain } from '@/lib/cookie-domain'

// Resolves the logged-in Penfix OS account (same session middleware.ts already
// validated) to this app's own `employees` row, by email — used to gate features
// like the Loan form to Regular employees only. Returns null if there's no
// matching employee record (e.g. onboarding not yet submitted, or email mismatch).
export async function getCurrentEmployee() {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('employees')
    .select('id, full_name, employment_status')
    .ilike('email', user.email)
    .maybeSingle()

  return data as { id: string; full_name: string; employment_status: string } | null
}
