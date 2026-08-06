import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCookieDomain } from '@/lib/cookie-domain'
import { evaluatePunchLateness, type AttendanceLogRow, type PunchType } from '@/lib/attendance-shared'

// Re-exported so existing server-side importers (app/my-records/page.tsx,
// app/admin/employee/[id]/page.tsx, components/EmployeeRecordSummary.tsx) can keep
// importing constants/types/pure helpers from '@/lib/attendance' unchanged — only
// client components need to reach into '@/lib/attendance-shared' directly to avoid
// pulling this file's "next/headers" import into the browser bundle.
export * from '@/lib/attendance-shared'

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

const SELECT_COLUMNS = 'id, punch_type, is_flagged, flag_reason, place_name, created_at, edited_by'

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

// Admin write: corrects a duplicate/mis-tagged punch (wrong step, wrong time) instead of
// deleting it outright. Relies on the admin_update_attendance_logs RLS policy
// (penfixads-OS/supabase/migrations — see attendance/supabase/migrations/052_attendance_admin_edit_delete.sql,
// must be copied/renumbered and run there per that file's own instructions) — the cookie-scoped
// client below carries the admin's own session, RLS is what actually authorizes the write.
// Callers (app/api/attendance-log/route.ts) must still call getAdminSession() first: RLS
// stops a non-admin's write, but the route should 401 before even attempting it.
export async function updateAttendanceLog(
  id: string,
  punchType: PunchType,
  createdAtIso: string,
  editedBy: string
): Promise<{ error: string | null }> {
  const supabase = await createOsServerClient()
  const { isFlagged, reason } = evaluatePunchLateness(punchType, createdAtIso)
  const { error } = await supabase
    .from('attendance_logs')
    .update({
      punch_type: punchType,
      created_at: createdAtIso,
      is_flagged: isFlagged,
      flag_reason: reason,
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
  return { error: error?.message ?? null }
}

// Admin write: removes a duplicate punch outright. Relies on admin_delete_attendance_logs
// RLS (same migration as updateAttendanceLog above) — no soft-delete/undo, so the caller
// (components/AttendancePunchRowActions.tsx) confirms with the admin before calling this.
export async function deleteAttendanceLog(id: string): Promise<{ error: string | null }> {
  const supabase = await createOsServerClient()
  const { error } = await supabase.from('attendance_logs').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// Admin write: manually fills in a MISSING punch (e.g. an employee forgot to log out) on
// another employee's behalf. Relies on the admin_insert_attendance_logs RLS policy
// (attendance/supabase/migrations/053_admin_insert_attendance.sql, must be copied/renumbered
// and run against penfixads-OS per that file's own instructions) — own_insert_attendance_logs
// from 049_attendance.sql only covers self-punches (user_email = auth.email()), which doesn't
// apply here since the caller is an Admin filling in for someone else.
export async function createAttendanceLog(
  userEmail: string,
  punchType: PunchType,
  createdAtIso: string,
  recordedBy: string
): Promise<{ error: string | null }> {
  const supabase = await createOsServerClient()
  const { isFlagged, reason } = evaluatePunchLateness(punchType, createdAtIso)
  const { error } = await supabase
    .from('attendance_logs')
    .insert({
      user_email: userEmail,
      punch_type: punchType,
      created_at: createdAtIso,
      is_flagged: isFlagged,
      flag_reason: reason,
      recorded_by: recordedBy,
      note: 'Manually added by Admin — punch was missing.',
    })
  return { error: error?.message ?? null }
}
