import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAttendanceLog, deleteAttendanceLog, createAttendanceLog } from '@/lib/attendance'
import { PUNCH_SEQUENCE, type PunchType } from '@/lib/attendance-shared'

// Admin-only add/correction/removal of a single attendance_logs punch — see
// components/AttendancePunchRowActions.tsx (edit/delete) and
// components/AttendancePunchAddAction.tsx (add) for the UI, and
// attendance/supabase/migrations/052_attendance_admin_edit_delete.sql (update/delete) +
// 053_admin_insert_attendance.sql (insert) for the RLS this depends on (must be copied into
// penfixads-OS and run there, per those files' headers).
//
// getAdminSession() is checked here even though RLS also enforces Admin-only writes —
// same defense-in-depth as app/api/request-approval/route.ts and app/api/boss-rating/route.ts,
// and it lets us return a clean 401 instead of a silent "0 rows affected" from RLS alone.

export async function POST(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_email, punch_type, created_at } = await req.json()
  if (!user_email || !(PUNCH_SEQUENCE as readonly string[]).includes(punch_type) || !created_at || isNaN(Date.parse(created_at))) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { error } = await createAttendanceLog(user_email, punch_type as PunchType, new Date(created_at).toISOString(), admin.email)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, punch_type, created_at } = await req.json()
  if (!id || !(PUNCH_SEQUENCE as readonly string[]).includes(punch_type) || !created_at || isNaN(Date.parse(created_at))) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { error } = await updateAttendanceLog(id, punch_type as PunchType, new Date(created_at).toISOString(), admin.email)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const { error } = await deleteAttendanceLog(id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
