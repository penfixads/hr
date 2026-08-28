import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { supabase } from '@/lib/supabase'
import { getAttendanceLogsForEmployees, summarizePayPeriod, computeAbsentDays, sumAbsentDays, computeMissingDays } from '@/lib/attendance'
import { getLeaveDateKeysForEmployees, getLeaveBalancesForEmployees, officeCalendarDate } from '@/lib/employee-records'
import { getCurrentPayPeriod } from '@/lib/payday'
import { getOfficeDateKey } from '@/lib/office-time'
import { surnameKey } from '@/lib/text'
import AttendanceListClient from './AttendanceListClient'

// No dynamic route segment (unlike app/admin/employee/[id]), so without this Next
// would try to statically prerender the page at build time — running the employees
// query with no request/session context instead of per-visitor.
export const dynamic = 'force-dynamic'

type Employee = { id: string; full_name: string; email: string; employment_status: string; team: string; date_joined: string | null }

export default async function AdminAttendancePage() {
  const payPeriod = getCurrentPayPeriod()

  const { data } = await supabase
    .from('employees')
    .select('id, full_name, email, employment_status, team, date_joined')
    .order('full_name', { ascending: true })
  // Re-sorted by surname client-side — there's no separate surname column to order by
  // in the query itself, and full_name is "First [Middle] Last", so the DB's own
  // ascending order is first-name-first. See lib/text.ts's surnameKey for how the
  // surname is picked out of the combined string.
  const employees = ((data as Employee[] | null) ?? []).sort((a, b) => surnameKey(a.full_name).localeCompare(surnameKey(b.full_name)))

  const [logsByEmail, leaveDateKeysByEmployee, leaveBalancesByEmployee] = await Promise.all([
    getAttendanceLogsForEmployees(employees.map(e => e.email).filter(Boolean), payPeriod.start, payPeriod.end),
    getLeaveDateKeysForEmployees(employees.map(e => e.id), officeCalendarDate(payPeriod.start), officeCalendarDate(payPeriod.end)),
    // Whole-year balances, not this period's — leave credits accrue and are spent across the
    // calendar year, so the figure beside Absent Days has to be the year's, not the fortnight's.
    getLeaveBalancesForEmployees(employees.map(e => ({ id: e.id, date_joined: e.date_joined }))),
  ])
  const todayKey = getOfficeDateKey(new Date())

  const entries = employees.map(emp => {
    const attendance = summarizePayPeriod(logsByEmail[emp.email] ?? [], todayKey)
    const leaveDateKeys = leaveDateKeysByEmployee[emp.id] ?? new Set<string>()
    const absentDays = sumAbsentDays(computeAbsentDays(payPeriod.start, payPeriod.end, attendance.dayGroups, leaveDateKeys, todayKey))
    const missingDays = computeMissingDays(payPeriod.start, payPeriod.end, attendance.dayGroups, leaveDateKeys, todayKey)
    return { employee: emp, attendance, absentDays, missingDays, leaveBalances: leaveBalancesByEmployee[emp.id] }
  })

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Attendance — ${payPeriod.label}`} />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#D9BB6E' }}>Attendance — {payPeriod.label}</h2>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#D9BB6E' }}>← Back to Dashboard</Link>
        </div>

        <AttendanceListClient entries={entries} />
      </main>

      <PenfixFooter />
    </div>
  )
}
