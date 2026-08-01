import { NextResponse } from 'next/server'
import { getCurrentEmployee } from '@/lib/employee-session'

// TEMPORARY diagnostic route — remove after debugging the ADMIN_EMAILS bypass.
export async function GET() {
  const employee = await getCurrentEmployee()
  const raw = process.env.ADMIN_EMAILS ?? null
  return NextResponse.json({
    employee,
    adminEmailsPresent: raw !== null,
    adminEmailsLength: raw?.length ?? 0,
    adminEmailsEntries: raw ? raw.split(',').map(e => e.trim().toLowerCase()) : [],
  })
}
