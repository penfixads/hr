import { supabase } from '@/lib/supabase'

export type CashAdvanceRow = {
  id: string; request_date: string; amount: number; reason: string | null
  status: string; approved_by: string | null; resolved_at: string | null; reject_note: string | null
  submitted_at: string
}

export type LoanRow = {
  id: string; request_date: string; amount: number; payment_per_payday: number; reason: string | null
  status: string; approved_by: string | null; resolved_at: string | null; reject_note: string | null
  submitted_at: string
}

export type OvertimeRow = {
  id: string; ot_date: string; start_time: string; end_time: string; reason: string; filed_late: boolean
  submitted_at: string
}

export type UndertimeRow = {
  id: string; undertime_date: string; time_in: string | null; time_out: string | null; reason: string
  submitted_at: string
}

export type LeaveRow = {
  id: string; leave_type: string; start_date: string; end_date: string; reason: string | null
  days_requested: number; filed_late: boolean; submitted_at: string
}

export type QuarterlyEvaluationRow = {
  id: string; quarter: string; year: number; total: number; percentage: number; submitted_at: string
}

export type EmployeeRecords = {
  cashAdvances: CashAdvanceRow[]
  loans: LoanRow[]
  overtimes: OvertimeRow[]
  undertimes: UndertimeRow[]
  leaves: LeaveRow[]
  evaluations: QuarterlyEvaluationRow[]
}

// Every table here is fully public-read via the anon key (see supabase/schema.sql — all
// `for select to anon using (true)`), so this same helper is safe to call for both the
// self-service page (own id only, resolved server-side) and the admin detail page (any
// id, already gated to Admins by middleware.ts). Access control is "never pass an id that
// didn't come from the server-resolved session or the Admin-gated route", not RLS.
export async function getEmployeeRecords(employeeId: string): Promise<EmployeeRecords> {
  const [cashAdvances, loans, overtimes, undertimes, leaves, evaluations] = await Promise.all([
    supabase.from('cash_advance_requests')
      .select('id, request_date, amount, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
    supabase.from('loan_requests')
      .select('id, request_date, amount, payment_per_payday, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
    supabase.from('overtime_requests')
      .select('id, ot_date, start_time, end_time, reason, filed_late, submitted_at')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
    supabase.from('undertime_requests')
      .select('id, undertime_date, time_in, time_out, reason, submitted_at')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
    supabase.from('leave_requests')
      .select('id, leave_type, start_date, end_date, reason, days_requested, filed_late, submitted_at')
      .eq('employee_id', employeeId).order('submitted_at', { ascending: false }),
    supabase.from('quarterly_evaluations')
      .select('id, quarter, year, total, percentage, submitted_at')
      .eq('employee_id', employeeId).order('year', { ascending: false }).order('quarter', { ascending: false }),
  ])

  return {
    cashAdvances: (cashAdvances.data as CashAdvanceRow[]) ?? [],
    loans: (loans.data as LoanRow[]) ?? [],
    overtimes: (overtimes.data as OvertimeRow[]) ?? [],
    undertimes: (undertimes.data as UndertimeRow[]) ?? [],
    leaves: (leaves.data as LeaveRow[]) ?? [],
    evaluations: (evaluations.data as QuarterlyEvaluationRow[]) ?? [],
  }
}

export type RequestsOverviewEmployee = {
  employeeId: string
  employeeName: string
  cashAdvances: CashAdvanceRow[]
  loans: LoanRow[]
  overtimes: OvertimeRow[]
  leaves: LeaveRow[]
}

// Plain office-local calendar date ('YYYY-MM-DD') for comparing against `date` columns
// (request_date / ot_date / start_date) — deliberately NOT lib/office-time.ts's
// getOfficeDateKey, which shifts small-hours instants to the previous day for attendance
// punches specifically. These are ordinary calendar dates with no such shift.
function officeCalendarDate(d: Date): string {
  const local = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
}

// Admin, all employees at once, scoped to one pay period — powers the cross-employee
// requests overview (app/admin/requests/page.tsx), same batching idea as
// getAttendanceLogsForEmployees in lib/attendance.ts but query-side grouped by
// employee_id/employee_name (denormalized onto every request row, so no join to
// `employees` is needed).
//
// Cash Advance / Loan have an approval workflow, so "relevant to this period" means
// still Pending (regardless of when filed — an old unresolved request shouldn't fall off
// the list) OR resolved (Approved/Rejected) during the period. Overtime / Leave have no
// such workflow, so "relevant" is simply filed for a date inside the period.
export async function getRequestsOverviewForPeriod(periodStart: Date, periodEnd: Date): Promise<RequestsOverviewEmployee[]> {
  const startIso = periodStart.toISOString()
  const endIso = periodEnd.toISOString()
  const startKey = officeCalendarDate(periodStart)
  const endKey = officeCalendarDate(periodEnd)
  const pendingOrResolvedThisPeriod = `status.eq.Pending,and(resolved_at.gte.${startIso},resolved_at.lte.${endIso})`

  const [cashAdvances, loans, overtimes, leaves] = await Promise.all([
    supabase.from('cash_advance_requests')
      .select('id, employee_id, employee_name, request_date, amount, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .or(pendingOrResolvedThisPeriod)
      .order('submitted_at', { ascending: false }),
    supabase.from('loan_requests')
      .select('id, employee_id, employee_name, request_date, amount, payment_per_payday, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .or(pendingOrResolvedThisPeriod)
      .order('submitted_at', { ascending: false }),
    supabase.from('overtime_requests')
      .select('id, employee_id, employee_name, ot_date, start_time, end_time, reason, filed_late, submitted_at')
      .gte('ot_date', startKey).lte('ot_date', endKey)
      .order('ot_date', { ascending: true }),
    supabase.from('leave_requests')
      .select('id, employee_id, employee_name, leave_type, start_date, end_date, reason, days_requested, filed_late, submitted_at')
      .gte('start_date', startKey).lte('start_date', endKey)
      .order('start_date', { ascending: true }),
  ])

  type WithEmployee<T> = T & { employee_id: string; employee_name: string }
  const byEmployee = new Map<string, RequestsOverviewEmployee>()
  function bucket(employeeId: string, employeeName: string): RequestsOverviewEmployee {
    let entry = byEmployee.get(employeeId)
    if (!entry) {
      entry = { employeeId, employeeName, cashAdvances: [], loans: [], overtimes: [], leaves: [] }
      byEmployee.set(employeeId, entry)
    }
    return entry
  }

  for (const row of (cashAdvances.data as WithEmployee<CashAdvanceRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).cashAdvances.push(row)
  for (const row of (loans.data as WithEmployee<LoanRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).loans.push(row)
  for (const row of (overtimes.data as WithEmployee<OvertimeRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).overtimes.push(row)
  for (const row of (leaves.data as WithEmployee<LeaveRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).leaves.push(row)

  return Array.from(byEmployee.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}
