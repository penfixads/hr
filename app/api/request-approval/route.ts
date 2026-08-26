import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminSession } from '@/lib/admin-auth'

// Generalizes the old cash-advance-only /api/cash-advance-approval route to also cover
// loan_requests — both tables share the same status/approved_by/resolved_at/reject_note
// shape (supabase/schema.sql). Nothing called the old route yet (no approval UI existed
// until now), so this replaces it outright rather than keeping both.
const TABLES = {
  cash_advance: 'cash_advance_requests',
  loan: 'loan_requests',
  late_excuse: 'late_excuse_requests',
} as const

type RequestType = keyof typeof TABLES

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

  const { request_type, request_id, decision, reject_note } = await req.json()
  const table = TABLES[request_type as RequestType]
  if (!table || !request_id || (decision !== 'Approved' && decision !== 'Rejected')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  // A disapproval must carry a reason — this is the authoritative check; the client
  // (components/RequestApprovalActions.tsx) already blocks submitting without one, but
  // that's UX only, not enforcement.
  if (decision === 'Rejected' && !(reject_note && String(reject_note).trim())) {
    return NextResponse.json({ error: 'A reason is required to disapprove.' }, { status: 400 })
  }

  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from(table)
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
