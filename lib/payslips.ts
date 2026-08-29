import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookieDomain } from '@/lib/cookie-domain'

// The payslip an employee sees in MyHR is generated and frozen by the separate payroll
// app (payroll.penfixads.com) into the shared Penfix project's `payslips` table. Payroll's
// "Send to myHR" button is the publish step — it sets sent_to_myhr = true on the row (see
// penfixads-OS/supabase/migrations/067_payslip_send_gate.sql). This module is the read
// side of that gate: it only ever returns rows already marked sent, for the caller.

export type PayslipListItem = {
  id: string
  periodStart: string
  periodEnd: string
  netPay: number
  sentAt: string | null
}

export type PayslipDetail = {
  id: string
  employeeName: string
  periodStart: string
  periodEnd: string
  dateJoined: string | null
  monthlyRate: number
  perDayRate: number
  basePay: number
  overtimeHours: number
  overtimePay: number
  nightDiffHours: number
  nightDiffPay: number
  sundayPremiumHours: number
  sundayPremiumPay: number
  holidayPay: number
  holidayPayNote: string | null
  grossPay: number
  regularLoanPrincipal: number
  regularLoanRemaining: number
  regularLoanDeduction: number
  cashAdvanceDeduction: number
  lateUndertimeHours: number
  lateUndertimeDeduction: number
  unpaidLeaveDays: number
  unpaidLeaveDeduction: number
  sssDeduction: number
  pagibigDeduction: number
  philhealthDeduction: number
  totalDeduction: number
  netPay: number
  sickLeaveCredit: number
  sickLeaveUsed: number
  sickLeaveRemaining: number
  vacationLeaveCredit: number
  vacationLeaveUsed: number
  vacationLeaveRemaining: number
  lateSanctionCount: number
  preparedBy: string | null
  sentAt: string | null
}

// Cookie-scoped client against the Penfix OS project, used only to resolve the caller's
// email from the SSO session — same construction pattern as lib/attendance.ts /
// lib/employee-session.ts (duplicated rather than shared; it's a ~12-line inline builder).
async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieDomain = getCookieDomain((await headers()).get('host'))
  const os = createServerClient(
    process.env.NEXT_PUBLIC_OS_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_OS_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
    }
  )
  const { data: { user } } = await os.auth.getUser()
  return user?.email ?? null
}

// Service-role client. `payslips` and `payroll_runs` live in the shared Penfix project,
// but OS migration 061 scopes their RLS to the single payroll admin account. An employee's
// own anon session CAN read `payslips` (employee_read_own_payslips, added in 067) but
// NOT `payroll_runs`, which is needed to label each payslip's pay period — so this reads
// with the service role, and this module is itself the gate: every query below is pinned
// to `user_email = <caller>` AND `sent_to_myhr = true`. Same rationale as
// payroll/lib/supabase.ts — the service role bypasses RLS, it is not the access check.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_OS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service-role env vars are not configured.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key, { auth: { persistSession: false } }) as any
}

const num = (v: unknown) => Number(v ?? 0)

// Every payslip payroll has released to the logged-in employee, newest pay period first.
export async function getMyPayslips(): Promise<PayslipListItem[]> {
  const email = await getSessionEmail()
  if (!email) return []
  const db = serviceClient()

  const { data: slips } = await db
    .from('payslips')
    .select('id, net_pay, sent_at, payroll_run_id')
    .eq('user_email', email)
    .eq('sent_to_myhr', true)
  const rows = (slips ?? []) as { id: string; net_pay: number; sent_at: string | null; payroll_run_id: string }[]
  if (rows.length === 0) return []

  const runIds = [...new Set(rows.map(r => r.payroll_run_id))]
  const { data: runs } = await db
    .from('payroll_runs')
    .select('id, period_start, period_end')
    .in('id', runIds)
  const runById = new Map(
    ((runs ?? []) as { id: string; period_start: string; period_end: string }[]).map(r => [r.id, r])
  )

  return rows
    .map(r => {
      const run = runById.get(r.payroll_run_id)
      return {
        id: r.id,
        periodStart: run?.period_start ?? '',
        periodEnd: run?.period_end ?? '',
        netPay: num(r.net_pay),
        sentAt: r.sent_at,
      }
    })
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
}

// One released payslip by id, or null if it isn't the caller's or hasn't been sent.
export async function getMyPayslip(payslipId: string): Promise<PayslipDetail | null> {
  const email = await getSessionEmail()
  if (!email) return null
  const db = serviceClient()

  const { data: slip } = await db
    .from('payslips')
    .select('*')
    .eq('id', payslipId)
    .eq('user_email', email)
    .eq('sent_to_myhr', true)
    .maybeSingle()
  if (!slip) return null

  const [{ data: run }, { data: profile }] = await Promise.all([
    db.from('payroll_runs').select('period_start, period_end').eq('id', slip.payroll_run_id).maybeSingle(),
    db.from('payroll_profiles').select('date_joined').eq('user_email', email).maybeSingle(),
  ])

  return {
    id: slip.id,
    employeeName: slip.employee_name,
    periodStart: run?.period_start ?? '',
    periodEnd: run?.period_end ?? '',
    dateJoined: (profile?.date_joined as string | null) ?? null,
    monthlyRate: num(slip.monthly_rate),
    perDayRate: num(slip.per_day_rate),
    basePay: num(slip.base_pay),
    overtimeHours: num(slip.overtime_hours),
    overtimePay: num(slip.overtime_pay),
    nightDiffHours: num(slip.night_diff_hours),
    nightDiffPay: num(slip.night_diff_pay),
    sundayPremiumHours: num(slip.sunday_premium_hours),
    sundayPremiumPay: num(slip.sunday_premium_pay),
    holidayPay: num(slip.holiday_pay),
    holidayPayNote: (slip.holiday_pay_note as string | null) ?? null,
    grossPay: num(slip.gross_pay),
    regularLoanPrincipal: num(slip.regular_loan_principal),
    regularLoanRemaining: num(slip.regular_loan_remaining),
    regularLoanDeduction: num(slip.regular_loan_deduction),
    cashAdvanceDeduction: num(slip.cash_advance_deduction),
    lateUndertimeHours: num(slip.late_undertime_hours),
    lateUndertimeDeduction: num(slip.late_undertime_deduction),
    unpaidLeaveDays: num(slip.unpaid_leave_days),
    unpaidLeaveDeduction: num(slip.unpaid_leave_deduction),
    sssDeduction: num(slip.sss_deduction),
    pagibigDeduction: num(slip.pagibig_deduction),
    philhealthDeduction: num(slip.philhealth_deduction),
    totalDeduction: num(slip.total_deduction),
    netPay: num(slip.net_pay),
    sickLeaveCredit: num(slip.sick_leave_credit),
    sickLeaveUsed: num(slip.sick_leave_used),
    sickLeaveRemaining: num(slip.sick_leave_remaining),
    vacationLeaveCredit: num(slip.vacation_leave_credit),
    vacationLeaveUsed: num(slip.vacation_leave_used),
    vacationLeaveRemaining: num(slip.vacation_leave_remaining),
    lateSanctionCount: num(slip.late_sanction_count),
    preparedBy: (slip.prepared_by as string | null) ?? null,
    sentAt: slip.sent_at,
  }
}
