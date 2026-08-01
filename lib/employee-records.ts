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
