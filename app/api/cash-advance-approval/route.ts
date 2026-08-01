import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

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

  const { request_id, decision, reject_note } = await req.json()
  if (!request_id || (decision !== 'Approved' && decision !== 'Rejected')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cash_advance_requests')
    .update({
      status: decision,
      approved_by: admin.name || admin.email,
      resolved_at: new Date().toISOString(),
      reject_note: decision === 'Rejected' ? (reject_note || null) : null,
    })
    .eq('id', request_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
