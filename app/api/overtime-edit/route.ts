import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

// Lets an Admin fix a mistyped date/time/reason on an already-filed overtime request
// (components/RequestsOverviewClient.tsx) without asking the employee to refile. No
// approval workflow on overtime_requests to worry about clobbering (unlike cash advance/
// loan) — see app/api/request-approval/route.ts for that one.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, ot_date, start_time, end_time, reason } = await req.json()
  if (!request_id || !ot_date || !start_time || !end_time || !String(reason || '').trim()) {
    return NextResponse.json({ error: 'Date, both times, and a reason are all required.' }, { status: 400 })
  }

  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('overtime_requests')
    .update({ ot_date, start_time, end_time, reason: String(reason).trim() })
    .eq('id', request_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Lets an Admin remove an accidental duplicate filing (e.g. the same overtime submitted
// twice) — no undo, same as attendance punch deletion (app/api/attendance-log/route.ts),
// so the client confirms before calling this.
export async function DELETE(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id } = await req.json()
  if (!request_id) {
    return NextResponse.json({ error: 'Missing request_id.' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase.from('overtime_requests').delete().eq('id', request_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
