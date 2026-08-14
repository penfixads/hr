import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import EmployeeRecordSummary from '@/components/EmployeeRecordSummary'
import BossRatingEditor from '@/components/BossRatingEditor'
import { supabase } from '@/lib/supabase'
import { getEmployeeRecords } from '@/lib/employee-records'
import { getAttendanceLogsForEmployee, summarizePayPeriod, computeAbsentDays, sumAbsentDays, expandLeaveDateKeys } from '@/lib/attendance'
import { getCurrentPayPeriod, getNextPayday } from '@/lib/payday'
import { getOfficeDateKey } from '@/lib/office-time'
import { computeLeaveBalances } from '@/lib/leave'

type Employee = {
  id: string
  full_name: string
  nickname: string
  employee_number: string
  date_of_birth: string
  position: string
  department: string
  employment_status: string
  date_joined: string | null
  address: string
  mobile: string
  telephone: string
  email: string
  sss_number: string
  pagibig_number: string
  philhealth_number: string
  emergency_name: string
  emergency_relationship: string
  emergency_mobile: string
  emergency_alt: string
  team: string
  skills_self_rating: Record<string, number>
  skills_boss_rating: Record<string, number> | null
  submitted_at: string
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabase.from('employees').select('*').eq('id', id).single()
  const employee = data as Employee | null

  if (!employee) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader />
        <main className="flex-1 flex items-center justify-center text-gray-400">Employee not found.</main>
        <PenfixFooter />
      </div>
    )
  }

  const payPeriod = getCurrentPayPeriod()
  const nextPayday = getNextPayday()

  const [records, attendanceLogs] = await Promise.all([
    getEmployeeRecords(id),
    getAttendanceLogsForEmployee(employee.email, payPeriod.start, payPeriod.end),
  ])

  const todayKey = getOfficeDateKey(new Date())
  const attendance = summarizePayPeriod(attendanceLogs, todayKey)
  const absentDays = sumAbsentDays(computeAbsentDays(payPeriod.start, payPeriod.end, attendance.dayGroups, expandLeaveDateKeys(records.leaves), todayKey))
  const leaveBalances = computeLeaveBalances(records.leaves, employee.date_joined)

  const infoRow = (label: string, value?: string) => value ? (
    <div key={label} className="flex gap-2 text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Profile: ${employee.full_name}`} />

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: '#4A0000' }}>Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              {infoRow('Full Name', employee.full_name)}
              {infoRow('Nickname', employee.nickname)}
              {infoRow('Employee Number', employee.employee_number)}
              {infoRow('Date of Birth', employee.date_of_birth)}
              {infoRow('Position', employee.position)}
              {infoRow('Department', employee.department)}
              {infoRow('Employment Status', employee.employment_status)}
              {infoRow('Date Joined', employee.date_joined ?? undefined)}
            </div>
            <div>
              {infoRow('Mobile', employee.mobile)}
              {infoRow('Telephone', employee.telephone)}
              {infoRow('Email', employee.email)}
              {infoRow('Address', employee.address)}
              {infoRow('SSS Number', employee.sss_number)}
              {infoRow('Pag-IBIG Number', employee.pagibig_number)}
              {infoRow('PhilHealth Number', employee.philhealth_number)}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: '#4A0000' }}>Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {infoRow('Name', employee.emergency_name)}
            {infoRow('Relationship', employee.emergency_relationship)}
            {infoRow('Mobile', employee.emergency_mobile)}
            {infoRow('Alternative Contact', employee.emergency_alt)}
          </div>
        </div>

        <EmployeeRecordSummary
          mode="admin"
          employee={{ full_name: employee.full_name, employment_status: employee.employment_status, email: employee.email }}
          records={records}
          leaveBalances={leaveBalances}
          payPeriod={payPeriod}
          nextPayday={nextPayday}
          attendance={attendance}
          absentDays={absentDays}
        />

        <BossRatingEditor
          employeeId={employee.id}
          team={employee.team}
          skillsSelfRating={employee.skills_self_rating}
          initialBossRatings={employee.skills_boss_rating}
        />
      </main>

      <PenfixFooter />
    </div>
  )
}
