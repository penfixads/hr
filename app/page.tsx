import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getCurrentEmployee } from '@/lib/employee-session'
import { titleCase } from '@/lib/text'
import { supabase } from '@/lib/supabase'
import {
  evaluatePunch, summarizePayPeriod, computeAbsentDays, sumAbsentDays, expandLeaveDateKeys,
  getAttendanceLogsForEmployees, getMyAttendanceLogs,
} from '@/lib/attendance'
import { getOfficeStartOfDayUTC, getOfficeEndOfDayUTC, getOfficeDateKey, toOfficeLocal } from '@/lib/office-time'
import { getCurrentPayPeriod, countPaydaysSince } from '@/lib/payday'
import { PH_HOLIDAYS } from '@/lib/ph-holidays'

type MenuItem = {
  href: string
  icon: string
  title: string
  description: string
  // Custom artwork from public/images/myhricons — takes over from the emoji `icon`
  // when set (see ItemIcon below). Only some tiles have one; the rest keep the emoji.
  iconSrc?: string
  // Spans both grid columns — used for a lone item that would otherwise sit next to
  // an empty cell (e.g. Admin Dashboard above Attendance/Requests).
  wide?: boolean
  // Fills the bare space next to a wide card with a couple of live numbers instead of
  // leaving it blank — see the Admin Dashboard / MyHR tiles below.
  summary?: { label: string; value: string | number; warn?: boolean }[]
}

// Quick "what needs attention" numbers for the Admin Dashboard tile: who's late/absent
// today, and how many Cash Advance/Loan requests are still sitting on Pending. Attendance
// logs live in the Penfix OS Supabase project, not this app's own — getAttendanceLogsForEmployees
// (lib/attendance.ts) already carries the cookie-scoped client + RLS for that, so this
// reuses it rather than querying attendance_logs directly (which would hit the wrong project).
async function getAdminSummary() {
  const now = new Date()
  const todayStart = getOfficeStartOfDayUTC(now)
  const todayEnd = getOfficeEndOfDayUTC(now)
  const todayKey = getOfficeDateKey(now)
  // No attendance is expected on the office's rest day or a holiday, so "absent" doesn't
  // apply — same exclusions computeAbsentDays already makes for the pay-period figure.
  const isOffDay = toOfficeLocal(now).getUTCDay() === 0 || todayKey in PH_HOLIDAYS

  const [{ data: employeesData }, { count: pendingCash }, { count: pendingLoans }, { data: leavesTodayData }] = await Promise.all([
    supabase.from('employees').select('id, email'),
    supabase.from('cash_advance_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('loan_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('leave_requests').select('employee_id').lte('start_date', todayKey).gte('end_date', todayKey),
  ])

  const roster = ((employeesData as { id: string; email: string }[] | null) ?? []).filter(e => e.email)
  const logsByEmail = roster.length > 0
    ? await getAttendanceLogsForEmployees(roster.map(e => e.email), todayStart, todayEnd)
    : {}

  let lateToday = 0
  let loggedInToday = 0
  for (const emp of roster) {
    const loginRow = (logsByEmail[emp.email] ?? []).find(r => r.punch_type === 'login')
    if (!loginRow) continue
    loggedInToday++
    if (evaluatePunch('login', loginRow.created_at).isLate) lateToday++
  }

  const onLeaveToday = new Set(((leavesTodayData as { employee_id: string }[] | null) ?? []).map(l => l.employee_id)).size
  // Best-effort, live "hasn't shown up yet today" count — not the official pay-period
  // Absent Days figure (app/admin/attendance), which only finalizes a day once it's over.
  const absentToday = isOffDay ? 0 : Math.max(0, roster.length - loggedInToday - onLeaveToday)

  return {
    lateToday,
    absentToday,
    pendingCash: pendingCash ?? 0,
    pendingLoans: pendingLoans ?? 0,
  }
}

// Same idea as getAdminSummary, but scoped to the logged-in employee's own pay-period
// attendance and their own request history — for the MyHR tile.
async function getEmployeeSummary(employeeId: string) {
  const payPeriod = getCurrentPayPeriod()
  const todayKey = getOfficeDateKey(new Date())

  const [attendanceLogs, leavesRes, cashRes, loanRes] = await Promise.all([
    getMyAttendanceLogs(payPeriod.start, payPeriod.end),
    supabase.from('leave_requests').select('start_date, end_date').eq('employee_id', employeeId),
    supabase.from('cash_advance_requests').select('id', { count: 'exact', head: true }).eq('employee_id', employeeId).eq('status', 'Pending'),
    // Most recent Approved loan, to estimate what's left on it below — see countPaydaysSince.
    supabase.from('loan_requests').select('id, amount, payment_per_payday, resolved_at, status')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
  ])

  const attendance = summarizePayPeriod(attendanceLogs, todayKey)
  const leaveDateKeys = expandLeaveDateKeys(((leavesRes.data as { start_date: string; end_date: string }[] | null) ?? []))
  const absentDays = sumAbsentDays(computeAbsentDays(payPeriod.start, payPeriod.end, attendance.dayGroups, leaveDateKeys, todayKey))

  const loans = (loanRes.data as { id: string; amount: number; payment_per_payday: number; resolved_at: string | null; status: string }[] | null) ?? []
  const pendingLoan = loans.some(l => l.status === 'Pending')
  const activeLoan = loans.find(l => l.status === 'Approved' && l.resolved_at)
  let loanValue: string | number = pendingLoan ? 'Pending' : '—'
  if (activeLoan) {
    const paydaysElapsed = countPaydaysSince(new Date(activeLoan.resolved_at!))
    const remaining = Math.max(0, activeLoan.amount - activeLoan.payment_per_payday * paydaysElapsed)
    loanValue = remaining > 0 ? `₱${remaining.toLocaleString()}` : 'Paid off'
  }

  return {
    lateCount: attendance.lateCount,
    absentDays,
    pendingCash: cashRes.count ?? 0,
    loanValue,
  }
}

const MY_RECORDS: MenuItem[] = [
  { href: '/my-records', icon: '📋', iconSrc: '/images/myhricons/MyHr.png', title: 'MyHR', description: 'View your attendance, requests, and evaluation history.' },
]

const PAYSLIPS: MenuItem[] = [
  { href: '/payslips', icon: '🧾', title: 'Payslips', description: 'View and print the payslips payroll has released to you.' },
]

const ADMIN_DASHBOARD: MenuItem[] = [
  { href: '/admin', icon: '🛠️', iconSrc: '/images/admin%20hr/admin-dashboard.png', title: 'Admin Dashboard', description: 'Manage employees, records, and requests.', wide: true },
  { href: '/admin/attendance', icon: '🕒', iconSrc: '/images/admin%20hr/attendance.png', title: 'Attendance', description: 'View punch records for every employee this pay period.' },
  { href: '/admin/requests', icon: '📥', iconSrc: '/images/admin%20hr/request.png', title: 'Requests', description: 'See who filed a Cash Advance, Loan, Overtime, or Leave request this pay period.' },
]

const ADMIN_SKILLS_ASSESSMENT: MenuItem[] = [
  { href: '/admin/assess', icon: '⭐', iconSrc: '/images/admin%20hr/skills-assessment.png', title: 'Skills Assessment', description: 'Rate employee skills, one at a time, for raise consideration.' },
]

const ADMIN_APPLICANTS: MenuItem[] = [
  { href: '/admin/applicants', icon: '📄', iconSrc: '/images/admin%20hr/applicant%20screening.png', title: 'Applicant Screening', description: 'Send screening links to applicants and review their biodata.' },
  { href: '/admin/assessments', icon: '🧠', iconSrc: '/images/admin%20hr/applicant-assessment.png', title: 'Applicant Assessment', description: 'Send the assessment exam, then review scores and essays.' },
]

const FORMS: MenuItem[] = [
  { href: '/cash-advance', icon: '💵', iconSrc: '/images/myhricons/cash%20advance.png', title: 'Cash Advance', description: 'Request a cash advance.' },
  { href: '/loan', icon: '🏦', title: 'Loan', description: 'Request a regular loan, paid in installments.' },
  { href: '/overtime', icon: '⏱️', iconSrc: '/images/myhricons/overtime.png', title: 'Overtime', description: 'File overtime worked.' },
  { href: '/leave', icon: '🌴', iconSrc: '/images/myhricons/leave.png', title: 'Leave', description: 'File sick or vacation leave.' },
  { href: '/undertime', icon: '⏳', iconSrc: '/images/myhricons/undertime.png', title: 'Undertime', description: 'File a late login or early logout.' },
  { href: '/late-excuse', icon: '📝', title: 'Late Excuse', description: 'File a valid reason for a late login, for Admin review.' },
]

const OTHER: MenuItem[] = [
  { href: '/evaluate', icon: '⭐', iconSrc: '/images/myhricons/quarterly%20eval.png', title: 'Quarterly Self-Evaluation', description: 'Submit your 15-point quarterly self-evaluation.' },
]

const ONBOARDING: MenuItem[] = [
  { href: '/creative', icon: '🎨', iconSrc: '/images/myhricons/creative%20team%20onboarding.png', title: 'Creative Team Onboarding', description: 'Fill up your employee profile and skills self-assessment.' },
  { href: '/production', icon: '🔧', iconSrc: '/images/myhricons/prod%20onboarding.png', title: 'Production Team Onboarding', description: 'Fill up your employee profile and skills self-assessment.' },
]

function ItemIcon({ item }: { item: MenuItem }) {
  if (item.iconSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.iconSrc} alt="" className="w-9 h-9 object-contain" />
  }
  return <span className="text-3xl">{item.icon}</span>
}

function MenuCard({ item }: { item: MenuItem }) {
  const hasSummary = item.wide && item.summary && item.summary.length > 0
  return (
    <Link
      href={item.href}
      className={`pf-card group relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold rounded-2xl ${item.wide ? 'sm:col-span-2' : ''} ${hasSummary ? 'flex flex-col sm:flex-row' : 'flex flex-col gap-2 p-6'}`}
    >
      <span
        className="absolute inset-x-0 top-0 h-1 bg-penfix-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"
        aria-hidden
      />
      {hasSummary ? (
        <>
          <div className="flex flex-col gap-2 p-6 sm:w-1/2">
            <ItemIcon item={item} />
            <span className="text-lg font-bold text-foreground">{item.title}</span>
            <span className="text-sm pf-text-muted">{item.description}</span>
          </div>
          <div
            className="grid grid-cols-2 items-center gap-x-4 gap-y-3 px-6 py-4 sm:w-1/2 border-t sm:border-t-0 sm:border-l"
            style={{ borderColor: 'var(--penfix-border)' }}
          >
            {item.summary!.map(s => (
              <div key={s.label} className="text-center sm:text-left">
                <div className="text-2xl font-bold" style={{ color: s.warn ? '#F87171' : '#D9BB6E' }}>{s.value}</div>
                <div className="text-xs pf-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <ItemIcon item={item} />
          <span className="text-lg font-bold text-foreground">{item.title}</span>
          <span className="text-sm pf-text-muted">{item.description}</span>
        </>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-penfix-gold mb-3">
      {children}
    </h3>
  )
}

export default async function Home() {
  const employee = await getCurrentEmployee()
  // Forms are self-service filing pages ("request a cash advance for yourself") — an
  // Admin reviewing everyone else's filings isn't the one filling these out, so they get
  // the Requests overview tile above instead, not the forms themselves (see ADMIN_DASHBOARD).
  // Loan is further gated to Regular employees — Trainees and Probationary hires don't
  // yet qualify for the payday-installment loan program.
  const forms = employee?.isAdmin
    ? []
    : employee?.employment_status === 'Regular'
      ? FORMS
      : FORMS.filter(item => item.href !== '/loan')
  const adminSummary = employee?.isAdmin ? await getAdminSummary() : null
  const employeeSummary = !employee?.isAdmin && employee?.id ? await getEmployeeSummary(employee.id) : null

  const myRecords = employee?.isAdmin
    ? ADMIN_DASHBOARD.map(item => item.href === '/admin' && adminSummary
      ? {
        ...item,
        summary: [
          { label: 'Late Today', value: adminSummary.lateToday, warn: adminSummary.lateToday > 0 },
          { label: 'Absent Today', value: adminSummary.absentToday, warn: adminSummary.absentToday > 0 },
          { label: 'Cash Advance', value: adminSummary.pendingCash, warn: adminSummary.pendingCash > 0 },
          { label: 'Loan', value: adminSummary.pendingLoans, warn: adminSummary.pendingLoans > 0 },
        ],
      }
      : item)
    : MY_RECORDS.map(item => item.href === '/my-records' && employeeSummary
      ? {
        ...item,
        wide: true,
        summary: [
          { label: 'Late', value: employeeSummary.lateCount, warn: employeeSummary.lateCount > 0 },
          { label: 'Absent Days', value: employeeSummary.absentDays, warn: employeeSummary.absentDays > 0 },
          { label: 'Cash Advance', value: employeeSummary.pendingCash > 0 ? 'Pending' : '—' },
          { label: 'Loan', value: employeeSummary.loanValue },
        ],
      }
      : item)
  // full_name falls back to the login email when there's no matching employee row
  // (see lib/employee-session.ts) — skip the greeting name rather than show an email.
  const firstName = employee?.full_name && !employee.full_name.includes('@')
    ? titleCase(employee.full_name.split(' ')[0])
    : ''

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Employee Portal" />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-penfix-gold-light">
              Welcome Back{firstName ? `, ${firstName}` : ''}!
            </h2>
            <p className="pf-text-muted text-lg">What records would you like to look at today?</p>
          </div>

          <SectionLabel>{employee?.isAdmin ? 'Admin' : 'MyHR'}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {myRecords.map(item => <MenuCard key={item.href} item={item} />)}
            {!employee?.isAdmin && PAYSLIPS.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          {forms.length > 0 && (
            <>
              <SectionLabel>Forms</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {forms.map(item => <MenuCard key={item.href} item={item} />)}
              </div>
            </>
          )}

          <SectionLabel>Evaluation</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {OTHER.map(item => <MenuCard key={item.href} item={item} />)}
            {employee?.isAdmin && ADMIN_SKILLS_ASSESSMENT.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          {employee?.isAdmin && (
            <>
              <SectionLabel>Applicants</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {ADMIN_APPLICANTS.map(item => <MenuCard key={item.href} item={item} />)}
              </div>
            </>
          )}

          <SectionLabel>New Here?</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {ONBOARDING.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          <div className="text-center pt-6" style={{ borderTop: '1px solid var(--penfix-border)' }}>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-penfix-gold-light transition-colors hover:text-penfix-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold rounded"
            >
              Admin Dashboard <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
