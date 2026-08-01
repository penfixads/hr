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
