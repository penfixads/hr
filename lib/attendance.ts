import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCookieDomain } from '@/lib/cookie-domain'
import { getOfficeDateKey } from '@/lib/office-time'

export const PUNCH_SEQUENCE = ['login', 'lunchout', 'afterlunchin', 'logout'] as const
export type PunchType = (typeof PUNCH_SEQUENCE)[number]

export const PUNCH_LABELS: Record<PunchType, string> = {
  login: 'Login',
  lunchout: 'Lunch Out',
  afterlunchin: 'After Lunch In',
  logout: 'Logout',
}

export type AttendanceLogRow = {
  id: string
  punch_type: PunchType | 'in' | 'out'
  is_flagged: boolean
  flag_reason: string | null
  place_name: string | null
  created_at: string
}

export type DayGroup = {
  dateKey: string
  steps: Record<PunchType, AttendanceLogRow | null>
  lateCount: number
}

export type PayPeriodAttendanceSummary = {
  dayGroups: DayGroup[]
  completeDays: number
  incompleteDays: number
  lateCount: number
}

// Cookie-scoped client against the Penfix OS Supabase project (attendance_logs lives
// there, not in this app's own project) — same construction pattern already used in
// lib/employee-session.ts / lib/admin-auth.ts, duplicated rather than shared since it's
// a ~10-line inline builder each caller needs with its own cookies()/headers() context.
async function createOsServerClient() {
  const cookieStore = await cookies()
  const cookieDomain = getCookieDomain((await headers()).get('host'))
  return createServerClient(
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
}

const SELECT_COLUMNS = 'id, punch_type, is_flagged, flag_reason, place_name, created_at'

// Self-service: resolves the caller's own email from the session — never takes an email
// param, so a logged-in employee can only ever fetch their own punches.
export async function getMyAttendanceLogs(since: Date, until: Date): Promise<AttendanceLogRow[]> {
  const supabase = await createOsServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return []
  const { data } = await supabase
    .from('attendance_logs')
    .select(SELECT_COLUMNS)
    .eq('user_email', user.email)
    .gte('created_at', since.toISOString())
    .lte('created_at', until.toISOString())
    .order('created_at', { ascending: true })
  return (data as AttendanceLogRow[]) ?? []
}

// Admin: caller supplies the target employee's email. Relies entirely on the
// admin_select_attendance_logs RLS policy (penfixads-OS/supabase/migrations/049_attendance.sql)
// — doesn't re-check the Admin role itself; the only caller, app/admin/employee/[id]/page.tsx,
// is already gated to Admins by middleware.ts.
export async function getAttendanceLogsForEmployee(email: string, since: Date, until: Date): Promise<AttendanceLogRow[]> {
  const supabase = await createOsServerClient()
  const { data } = await supabase
    .from('attendance_logs')
    .select(SELECT_COLUMNS)
    .eq('user_email', email)
    .gte('created_at', since.toISOString())
    .lte('created_at', until.toISOString())
    .order('created_at', { ascending: true })
  return (data as AttendanceLogRow[]) ?? []
}

// Admin, all employees at once: same RLS policy as getAttendanceLogsForEmployee, just
// batched with .in() instead of one request per employee — used by the all-employees
// attendance listing (app/admin/attendance/page.tsx), also Admin-gated by middleware.ts.
export async function getAttendanceLogsForEmployees(emails: string[], since: Date, until: Date): Promise<Record<string, AttendanceLogRow[]>> {
  if (emails.length === 0) return {}
  const supabase = await createOsServerClient()
  const { data } = await supabase
    .from('attendance_logs')
    .select(`${SELECT_COLUMNS}, user_email`)
    .in('user_email', emails)
    .gte('created_at', since.toISOString())
    .lte('created_at', until.toISOString())
    .order('created_at', { ascending: true })

  const byEmail: Record<string, AttendanceLogRow[]> = {}
  for (const row of (data as (AttendanceLogRow & { user_email: string })[]) ?? []) {
    const { user_email, ...rest } = row
    ;(byEmail[user_email] ??= []).push(rest)
  }
  return byEmail
}

// Groups punches by office-local calendar day, most recent first — ported from
// attendance/app/my-logs/MyLogsClient.tsx's grouping logic.
export function groupLogsByDay(rows: AttendanceLogRow[]): DayGroup[] {
  const byDate = new Map<string, DayGroup>()
  for (const row of rows) {
    const dateKey = getOfficeDateKey(new Date(row.created_at))
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        steps: { login: null, lunchout: null, afterlunchin: null, logout: null },
        lateCount: 0,
      })
    }
    const group = byDate.get(dateKey)!
    if ((PUNCH_SEQUENCE as readonly string[]).includes(row.punch_type)) {
      group.steps[row.punch_type as PunchType] = row
      if (row.is_flagged) group.lateCount += 1
    }
  }
  return Array.from(byDate.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
}

// A day only counts as "incomplete" once it's over — today (still in progress) isn't
// penalized for missing steps that just haven't happened yet.
export function summarizePayPeriod(rows: AttendanceLogRow[], todayKey: string): PayPeriodAttendanceSummary {
  const dayGroups = groupLogsByDay(rows)
  let completeDays = 0
  let incompleteDays = 0
  let lateCount = 0
  for (const day of dayGroups) {
    const missingSteps = PUNCH_SEQUENCE.some(step => !day.steps[step])
    if (!missingSteps) completeDays++
    else if (day.dateKey !== todayKey) incompleteDays++
    lateCount += day.lateCount
  }
  return { dayGroups, completeDays, incompleteDays, lateCount }
}
