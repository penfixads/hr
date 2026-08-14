import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import EmployeeRecordSummary from '@/components/EmployeeRecordSummary'
import { getCurrentEmployee } from '@/lib/employee-session'
import { supabase } from '@/lib/supabase'
import { getEmployeeRecords } from '@/lib/employee-records'
import { getMyAttendanceLogs, summarizePayPeriod, computeAbsentDays, sumAbsentDays, expandLeaveDateKeys } from '@/lib/attendance'
import { getCurrentPayPeriod, getNextPayday } from '@/lib/payday'
import { getOfficeDateKey } from '@/lib/office-time'
import { computeLeaveBalances } from '@/lib/leave'

export const metadata = {
  title: 'MyHR — Penfix',
}

export default async function MyRecordsPage() {
  const employee = await getCurrentEmployee()

  if (!employee?.id) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader subtitle="MyHR" />
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center text-gray-500">
          No HR record found for your account yet — contact HR if you believe this is a mistake.
        </main>
        <PenfixFooter />
      </div>
    )
  }

  const { data: full } = await supabase
    .from('employees')
    .select('date_joined')
    .eq('id', employee.id)
    .single()

  const payPeriod = getCurrentPayPeriod()
  const nextPayday = getNextPayday()

  const [records, attendanceLogs] = await Promise.all([
    getEmployeeRecords(employee.id),
    getMyAttendanceLogs(payPeriod.start, payPeriod.end),
  ])

  const todayKey = getOfficeDateKey(new Date())
  const attendance = summarizePayPeriod(attendanceLogs, todayKey)
  const absentDays = sumAbsentDays(computeAbsentDays(payPeriod.start, payPeriod.end, attendance.dayGroups, expandLeaveDateKeys(records.leaves), todayKey))
  const leaveBalances = computeLeaveBalances(records.leaves, (full as { date_joined: string | null } | null)?.date_joined ?? null)

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="MyHR" />
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#4A0000' }}>{employee.full_name}&apos;s Records</h2>
          <Link href="/my-records/edit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#4A0000' }}>
            Edit My Info
          </Link>
        </div>
        <EmployeeRecordSummary
          mode="self"
          employee={{ full_name: employee.full_name, employment_status: employee.employment_status }}
          records={records}
          leaveBalances={leaveBalances}
          payPeriod={payPeriod}
          nextPayday={nextPayday}
          attendance={attendance}
          absentDays={absentDays}
        />
      </main>
      <PenfixFooter />
    </div>
  )
}
