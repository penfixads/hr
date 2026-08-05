import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getCookieDomain } from '@/lib/cookie-domain'

// Gates the whole portal behind the same login as Penfix OS: sessions come from
// the PENFIX OS Supabase project (NEXT_PUBLIC_OS_SUPABASE_* — not this app's own
// project), and cookies are scoped to .penfixads.com, so staff already signed
// into jobs.penfixads.com walk straight in without seeing the login page.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Also the one route that keeps rendering even if NEXT_PUBLIC_OS_SUPABASE_* is
  // misconfigured for this deployment target (e.g. an env-var gap on a given
  // Preview/staging build) — every other path below constructs a Supabase client
  // from those build-time-inlined values and throws immediately if they're bad.
  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const cookieDomain = getCookieDomain(request.headers.get('host'))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_OS_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_OS_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...(cookieDomain ? { domain: cookieDomain } : {}) })
          )
        },
      },
    }
  )

  // This refreshes the session and writes updated cookies to supabaseResponse
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Must also be a known, active Penfix OS user — not just any auth identity.
  // Unlike jobs.penfixads.com, role 'None' is allowed here: those are still
  // employees (e.g. tools-only custodians) who need to fill their assessment.
  const { data: userData } = await supabase
    .from('users')
    .select('is_active, role')
    .eq('user_email', user.email)
    .single()

  if (!userData || userData.is_active === false) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'no-access')
    return NextResponse.redirect(loginUrl)
  }

  // /admin (Boss Allen dashboard + employee detail pages) requires the Admin role on
  // the same shared Penfix OS account — same mechanism the attendance app uses
  // (`u.role = 'Admin'` in employee_face_descriptors' admin_select_all policy), so
  // there's one login and one role everywhere instead of a separate admin password.
  if (pathname.startsWith('/admin') && userData.role !== 'Admin') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.searchParams.set('error', 'admin-only')
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|icon|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
