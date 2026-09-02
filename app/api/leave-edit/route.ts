import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentEmployee } from '@/lib/employee-session'
import { daysInclusive, checkFilingPolicy, officeDayKey, type LeaveType } from '@/lib/leave'

// Lets an employee correct a leave they already filed, from MyHR (components/LeaveRowEditor.tsx).
// The case this exists for: a one-day leave filed as a two-day range ("Aug 31 - Sep 1" for
// Aug 31 only), which burns a second credit and exempts a worked day from the absent-day
// count. leave_requests has no approval workflow to reopen (unlike cash advance / loan), so
// there is no status to clobber — the row is simply corrected in place.
//
// Authorization is the same shape as app/api/overtime-edit/route.ts but employee-scoped
// instead of Admin-scoped: the employee is resolved server-side from the Penfix OS session,
// and the update is filtered by employee_id, so a forged request_id belonging to someone
// else matches no row. The service-role key is used because leave_requests deliberately has
// no anon update policy (see supabase/CATCHUP_leave_edit.sql) — a public one would let
// anyone holding the browser-shipped anon key rewrite anybody's leave.
const LEAVE_TYPES: LeaveType[] = ['Sick Leave', 'Vacation Leave']

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const employee = await getCurrentEmployee()
  if (!employee?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, leave_type, start_date, end_date, reason } = await req.json()
  if (!request_id || !leave_type || !start_date || !end_date) {
    return NextResponse.json({ error: 'Leave type and both dates are required.' }, { status: 400 })
  }
  if (!LEAVE_TYPES.includes(leave_type)) {
    return NextResponse.json({ error: 'Unknown leave type.' }, { status: 400 })
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: 'End of Leave can\u2019t be before Start of Leave.' }, { status: 400 })
  }

  const supabase = getAdminClient()

  // submitted_at, not now(): the filing-window policy is about when the leave was FILED,
  // and an edit must not move that goalpost. Also doubles as the ownership check — the
  // row has to exist AND belong to this employee before anything is written.
  const { data: existing } = await supabase
    .from('leave_requests')
    .select('id, submitted_at')
    .eq('id', request_id)
    .eq('employee_id', employee.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Leave filing not found.' }, { status: 404 })
  }

  const filedOnKey = officeDayKey(new Date((existing as { submitted_at: string }).submitted_at))
  const { filedLate } = checkFilingPolicy(leave_type as LeaveType, start_date, end_date, filedOnKey)

  const patch = {
    leave_type,
    start_date,
    end_date,
    reason: String(reason ?? '').trim() || null,
    // Recomputed here rather than trusted from the client — days_requested drives the
    // credit balance (lib/leave.ts) and the absent-day exemption (lib/attendance-shared.ts).
    days_requested: daysInclusive(start_date, end_date),
    filed_late: filedLate,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const write = (values: Record<string, unknown>) => (supabase as any)
    .from('leave_requests')
    .update(values)
    .eq('id', request_id)
    .eq('employee_id', employee.id)

  let { error } = await write({ ...patch, edited_at: new Date().toISOString() })

  // Deploys land before the SQL does. If supabase/CATCHUP_leave_edit.sql hasn't been run
  // on this project yet, PostgREST rejects the unknown column (PGRST204) — save the
  // correction anyway rather than leaving the employee stuck with wrong dates, just
  // without the edited marker.
  if (error && /edited_at/.test(error.message ?? '')) {
    ;({ error } = await write(patch))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, days_requested: patch.days_requested, filed_late: filedLate })
}
