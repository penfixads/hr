import { supabase } from '@/lib/supabase'
import { expandLeaveDateKeys } from '@/lib/attendance-shared'
import { computeLeaveBalances } from '@/lib/leave'

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

// Approval-gated, same shape as CashAdvanceRow/LoanRow — see supabase/CATCHUP_late_excuse.sql.
// Only an Approved row exempts late_date from payroll's Late Sanction Count.
export type LateExcuseRow = {
  id: string; late_date: string; reason: string
  status: string; approved_by: string | null; resolved_at: string | null; reject_note: string | null
  submitted_at: string
}

export type EmployeeRecords = {
  cashAdvances: CashAdvanceRow[]
  loans: LoanRow[]
  overtimes: OvertimeRow[]
  undertimes: UndertimeRow[]
  leaves: LeaveRow[]
  lateExcuses: LateExcuseRow[]
  evaluations: QuarterlyEvaluationRow[]
}

// Every table here is fully public-read via the anon key (see supabase/schema.sql — all
// `for select to anon using (true)`), so this same helper is safe to call for both the
// self-service page (own id only, resolved server-side) and the admin detail page (any
// id, already gated to Admins by middleware.ts). Access control is "never pass an id that
// didn't come from the server-resolved session or the Admin-gated route", not RLS.
export async function getEmployeeRecords(employeeId: string): Promise<EmployeeRecords> {
  const [cashAdvances, loans, overtimes, undertimes, leaves, lateExcuses, evaluations] = await Promise.all([
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
    supabase.from('late_excuse_requests')
      .select('id, late_date, reason, status, approved_by, resolved_at, reject_note, submitted_at')
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
    lateExcuses: (lateExcuses.data as LateExcuseRow[]) ?? [],
    evaluations: (evaluations.data as QuarterlyEvaluationRow[]) ?? [],
  }
}

// Bulk leave lookup for lib/attendance-shared.ts's computeAbsentDays, batched across
// employees like getAttendanceLogsForEmployees — used by the admin attendance roster
// (app/admin/attendance/page.tsx), which otherwise never fetches leave_requests at all.
// Overlap query (not just "starts inside the period") so a leave that started before this
// period but runs into it still exempts the days it actually covers here.
export async function getLeaveDateKeysForEmployees(employeeIds: string[], periodStartKey: string, periodEndKey: string): Promise<Record<string, Set<string>>> {
  if (employeeIds.length === 0) return {}
  const { data } = await supabase
    .from('leave_requests')
    .select('employee_id, start_date, end_date')
    .in('employee_id', employeeIds)
    .lte('start_date', periodEndKey)
    .gte('end_date', periodStartKey)

  const byEmployee: Record<string, { start_date: string; end_date: string }[]> = {}
  for (const row of (data as { employee_id: string; start_date: string; end_date: string }[]) ?? []) {
    (byEmployee[row.employee_id] ??= []).push(row)
  }

  const result: Record<string, Set<string>> = {}
  for (const [employeeId, leaves] of Object.entries(byEmployee)) {
    result[employeeId] = expandLeaveDateKeys(leaves)
  }
  return result
}

export type RequestsOverviewEmployee = {
  employeeId: string
  employeeName: string
  cashAdvances: CashAdvanceRow[]
  loans: LoanRow[]
  overtimes: OvertimeRow[]
  leaves: LeaveRow[]
  lateExcuses: LateExcuseRow[]
}

// Plain office-local calendar date ('YYYY-MM-DD') for comparing against `date` columns
// (request_date / ot_date / start_date) — deliberately NOT lib/office-time.ts's
// getOfficeDateKey, which shifts small-hours instants to the previous day for attendance
// punches specifically. These are ordinary calendar dates with no such shift.
// Per-type leave balances for a roster, so a list page can show the same Accrued/Used/
// Remaining figures the employee detail page shows. Scoped to the current calendar year
// because that is the accrual period — computeLeaveBalances filters by year again on its
// own, but there is no reason to drag prior years across the wire.
export async function getLeaveBalancesForEmployees(
  employees: { id: string; date_joined: string | null }[]
): Promise<Record<string, ReturnType<typeof computeLeaveBalances>>> {
  const result: Record<string, ReturnType<typeof computeLeaveBalances>> = {}
  if (employees.length === 0) return result

  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('leave_requests')
    .select('employee_id, leave_type, start_date, days_requested')
    .in('employee_id', employees.map(e => e.id))
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`)

  const byEmployee: Record<string, { leave_type: string; start_date: string; days_requested: number }[]> = {}
  for (const row of (data as { employee_id: string; leave_type: string; start_date: string; days_requested: number }[]) ?? []) {
    (byEmployee[row.employee_id] ??= []).push(row)
  }
  for (const employee of employees) {
    result[employee.id] = computeLeaveBalances(byEmployee[employee.id] ?? [], employee.date_joined)
  }
  return result
}

export function officeCalendarDate(d: Date): string {
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
//
// resolvedCutoff (not periodEnd) bounds the "resolved" side deliberately: per
// lib/payday.ts's getPayCycle, the period stays "current" through its own payday, one day
// past periodEnd (the attendance cutoff) — so an approval made ON payday, while this page
// is still showing that period, must not fall outside the window it's being checked
// against, or it silently vanishes (never shown here, already too old for the next
// period). Pass payPeriod.payday, not payPeriod.end.
export async function getRequestsOverviewForPeriod(periodStart: Date, periodEnd: Date, resolvedCutoff: Date): Promise<RequestsOverviewEmployee[]> {
  const startIso = periodStart.toISOString()
  const resolvedCutoffIso = resolvedCutoff.toISOString()
  const startKey = officeCalendarDate(periodStart)
  const endKey = officeCalendarDate(periodEnd)
  const pendingOrResolvedThisPeriod = `status.eq.Pending,and(resolved_at.gte.${startIso},resolved_at.lte.${resolvedCutoffIso})`

  const [cashAdvances, loans, overtimes, leaves, lateExcuses] = await Promise.all([
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
    // Approval workflow like cash advance/loan (not date-scoped like overtime/leave) —
    // still Pending regardless of when the late date was, OR resolved during this period.
    supabase.from('late_excuse_requests')
      .select('id, employee_id, employee_name, late_date, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .or(pendingOrResolvedThisPeriod)
      .order('submitted_at', { ascending: false }),
  ])

  type WithEmployee<T> = T & { employee_id: string; employee_name: string }
  const byEmployee = new Map<string, RequestsOverviewEmployee>()
  function bucket(employeeId: string, employeeName: string): RequestsOverviewEmployee {
    let entry = byEmployee.get(employeeId)
    if (!entry) {
      entry = { employeeId, employeeName, cashAdvances: [], loans: [], overtimes: [], leaves: [], lateExcuses: [] }
      byEmployee.set(employeeId, entry)
    }
    return entry
  }

  for (const row of (cashAdvances.data as WithEmployee<CashAdvanceRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).cashAdvances.push(row)
  for (const row of (loans.data as WithEmployee<LoanRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).loans.push(row)
  for (const row of (overtimes.data as WithEmployee<OvertimeRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).overtimes.push(row)
  for (const row of (leaves.data as WithEmployee<LeaveRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).leaves.push(row)
  for (const row of (lateExcuses.data as WithEmployee<LateExcuseRow>[] | null) ?? []) bucket(row.employee_id, row.employee_name).lateExcuses.push(row)

  return Array.from(byEmployee.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

export type CashAdvanceHistoryRow = CashAdvanceRow & { employeeId: string; employeeName: string }
export type LoanHistoryRow = LoanRow & { employeeId: string; employeeName: string }
export type OvertimeHistoryRow = OvertimeRow & { employeeId: string; employeeName: string }
export type UndertimeHistoryRow = UndertimeRow & { employeeId: string; employeeName: string }
export type LeaveHistoryRow = LeaveRow & { employeeId: string; employeeName: string }

export type RequestsHistory = {
  cashAdvances: CashAdvanceHistoryRow[]
  loans: LoanHistoryRow[]
  overtimes: OvertimeHistoryRow[]
  undertimes: UndertimeHistoryRow[]
  leaves: LeaveHistoryRow[]
}

// Admin, every request of every type, every employee, all time — unlike
// getRequestsOverviewForPeriod above, deliberately NOT scoped to a pay period. Powers the
// browse-by-type history page (app/admin/history), the answer to "where do resolved
// Cash Advance / Loan requests go once they've aged out of the current period's view" —
// nowhere, they just aren't period-scoped here.
export async function getAllRequestsHistory(): Promise<RequestsHistory> {
  const [cashAdvances, loans, overtimes, undertimes, leaves] = await Promise.all([
    supabase.from('cash_advance_requests')
      .select('id, employee_id, employee_name, request_date, amount, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .order('submitted_at', { ascending: false }),
    supabase.from('loan_requests')
      .select('id, employee_id, employee_name, request_date, amount, payment_per_payday, reason, status, approved_by, resolved_at, reject_note, submitted_at')
      .order('submitted_at', { ascending: false }),
    supabase.from('overtime_requests')
      .select('id, employee_id, employee_name, ot_date, start_time, end_time, reason, filed_late, submitted_at')
      .order('submitted_at', { ascending: false }),
    supabase.from('undertime_requests')
      .select('id, employee_id, employee_name, undertime_date, time_in, time_out, reason, submitted_at')
      .order('submitted_at', { ascending: false }),
    supabase.from('leave_requests')
      .select('id, employee_id, employee_name, leave_type, start_date, end_date, reason, days_requested, filed_late, submitted_at')
      .order('submitted_at', { ascending: false }),
  ])

  function withEmployee<T extends { employee_id: string; employee_name: string }>(rows: T[] | null): (T & { employeeId: string; employeeName: string })[] {
    return (rows ?? []).map(r => ({ ...r, employeeId: r.employee_id, employeeName: r.employee_name }))
  }

  return {
    cashAdvances: withEmployee(cashAdvances.data as (CashAdvanceRow & { employee_id: string; employee_name: string })[] | null),
    loans: withEmployee(loans.data as (LoanRow & { employee_id: string; employee_name: string })[] | null),
    overtimes: withEmployee(overtimes.data as (OvertimeRow & { employee_id: string; employee_name: string })[] | null),
    undertimes: withEmployee(undertimes.data as (UndertimeRow & { employee_id: string; employee_name: string })[] | null),
    leaves: withEmployee(leaves.data as (LeaveRow & { employee_id: string; employee_name: string })[] | null),
  }
}
