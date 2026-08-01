import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookieDomain } from '@/lib/cookie-domain'

// Emails in ADMIN_EMAILS (comma-separated) bypass employment-status gates like the
// Loan-request restriction — for the owner/admins, not tied to their HR record.
function isAdminEmail(email: string) {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
}

// Resolves the logged-in Penfix OS account (same session middleware.ts already
// validated) to this app's own `employees` row, by email — used to gate features
// like the Loan form to Regular employees only. Returns null if there's no
// matching employee record (e.g. onboarding not yet submitted, or email mismatch)
// and the account isn't an admin.
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

  const isAdmin = isAdminEmail(user.email)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('employees')
    .select('id, full_name, employment_status')
    .ilike('email', user.email)
    .maybeSingle()

  if (!data && !isAdmin) return null

  return {
    id: data?.id ?? null,
    full_name: data?.full_name ?? user.email,
    employment_status: data?.employment_status ?? null,
    isAdmin,
  } as { id: string | null; full_name: string; employment_status: string | null; isAdmin: boolean }
}
