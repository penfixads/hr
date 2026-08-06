import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { supabase } from '@/lib/supabase'
import { getAttendanceLogsForEmployees, summarizePayPeriod } from '@/lib/attendance'
import { getCurrentPayPeriod } from '@/lib/payday'
import { getOfficeDateKey } from '@/lib/office-time'
import AttendanceListClient from './AttendanceListClient'

// No dynamic route segment (unlike app/admin/employee/[id]), so without this Next
// would try to statically prerender the page at build time — running the employees
// query with no request/session context instead of per-visitor.
export const dynamic = 'force-dynamic'

type Employee = { id: string; full_name: string; email: string; employment_status: string; team: string }

export default async function AdminAttendancePage() {
  const payPeriod = getCurrentPayPeriod()

  const { data } = await supabase
    .from('employees')
    .select('id, full_name, email, employment_status, team')
    .order('full_name', { ascending: true })
  const employees = (data as Employee[]) ?? []

  const logsByEmail = await getAttendanceLogsForEmployees(
    employees.map(e => e.email).filter(Boolean),
    payPeriod.start,
    payPeriod.end
  )
  const todayKey = getOfficeDateKey(new Date())

  const entries = employees.map(emp => ({
    employee: emp,
    attendance: summarizePayPeriod(logsByEmail[emp.email] ?? [], todayKey),
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Attendance — ${payPeriod.label}`} />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#4A0000' }}>Attendance — {payPeriod.label}</h2>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
        </div>

        <AttendanceListClient entries={entries} />
      </main>

      <PenfixFooter />
    </div>
  )
}
