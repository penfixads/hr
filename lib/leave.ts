import { toOfficeLocal } from '@/lib/office-time'

export const MS_PER_DAY = 24 * 60 * 60 * 1000
export const ANNUAL_CREDITS = 5
export const MONTHLY_ACCRUAL = 0.42

export function toDate(s: string) {
  return new Date(s + 'T00:00:00')
}

export function daysInclusive(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / MS_PER_DAY) + 1
}

// Accrued credits this year, capped at the annual total: 0.42/month from Jan (or the
// employee's join month if they joined this year) through the current month, inclusive.
export function accruedCredits(dateJoined: string | null) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  let startMonth = 1
  if (dateJoined) {
    const joined = toDate(dateJoined)
    if (joined.getFullYear() === currentYear) startMonth = joined.getMonth() + 1
    else if (joined.getFullYear() > currentYear) return 0
  }
  const monthsElapsed = Math.max(0, currentMonth - startMonth + 1)
  return Math.min(monthsElapsed * MONTHLY_ACCRUAL, ANNUAL_CREDITS)
}

export type LeaveBalance = { accrued: number; used: number; remaining: number }

// Same per-type balance calc LeaveForm.tsx shows while filing a request, exposed here so
// a read-only summary (My Records / admin detail) can show the same numbers.
export function computeLeaveBalances(
  leaves: { leave_type: string; start_date: string; days_requested: number }[],
  dateJoined: string | null
): Record<'Sick Leave' | 'Vacation Leave', LeaveBalance> {
  const currentYear = new Date().getFullYear()
  const accrued = accruedCredits(dateJoined)
  const balanceFor = (type: 'Sick Leave' | 'Vacation Leave'): LeaveBalance => {
    const used = leaves
      .filter(l => l.leave_type === type && toDate(l.start_date).getFullYear() === currentYear)
      .reduce((sum, l) => sum + l.days_requested, 0)
    return { accrued, used, remaining: accrued - used }
  }
  return { 'Sick Leave': balanceFor('Sick Leave'), 'Vacation Leave': balanceFor('Vacation Leave') }
}

export type LeaveType = 'Sick Leave' | 'Vacation Leave'

// Plain office-local calendar date ('YYYY-MM-DD'). Deliberately NOT office-time's
// getOfficeDateKey, which shifts a small-hours instant back to the previous day for
// attendance punches — leave notice periods are counted in ordinary calendar days.
export function officeDayKey(d: Date): string {
  return toOfficeLocal(d).toISOString().slice(0, 10)
}

export type FilingCheck = {
  noticeDays: number | null
  daysSinceReturn: number | null
  vacationTooSoon: boolean
  sickFiledLate: boolean
  filedLate: boolean
}

// The two filing-window rules from GENERAL POLICY.docx: vacation leave filed >=3 days
// before it starts, sick leave filed within 3 days of returning to work.
//
// Measured against the day the request was FILED (filedOnKey), never "today" — when an
// employee corrects an already-filed leave (app/api/leave-edit/route.ts) the check has to
// be redone against the original submitted_at, or fixing a mistyped end date would
// quietly clear a late flag the filing genuinely earned (or invent one it didn't).
// LeaveForm.tsx passes today because, for a new filing, today IS the filing day.
export function checkFilingPolicy(
  leaveType: LeaveType,
  startDate: string,
  endDate: string,
  filedOnKey: string
): FilingCheck {
  const filedOn = toDate(filedOnKey).getTime()
  const noticeDays = startDate ? Math.floor((toDate(startDate).getTime() - filedOn) / MS_PER_DAY) : null
  const daysSinceReturn = endDate ? Math.floor((filedOn - toDate(endDate).getTime()) / MS_PER_DAY) : null
  const vacationTooSoon = leaveType === 'Vacation Leave' && noticeDays !== null && noticeDays < 3
  const sickFiledLate = leaveType === 'Sick Leave' && daysSinceReturn !== null && daysSinceReturn > 3
  return { noticeDays, daysSinceReturn, vacationTooSoon, sickFiledLate, filedLate: vacationTooSoon || sickFiledLate }
}
