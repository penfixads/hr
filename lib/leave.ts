export const MS_PER_DAY = 24 * 60 * 60 * 1000
export const ANNUAL_CREDITS = 5
export const MONTHLY_ACCRUAL = 0.42

export function toDate(s: string) {
  return new Date(s + 'T00:00:00')
}

export function daysInclusive(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / MS_PER_DAY) + 1
}

// An employee may not take PAID leave until this many months of service. They still accrue
// from the start; they simply cannot spend it yet, and leave taken before then is unpaid.
export const ELIGIBILITY_MONTHS = 3

// Accrued credits this year, capped at the annual total: 0.42 per month, credited on the 1st.
//
// Because credits land on the 1st, the join month only counts when the employee was already
// employed on that day -- i.e. they joined ON the 1st. Someone hired mid-month gets their
// first credit on the 1st of the FOLLOWING month. This previously counted the join month
// unconditionally, over-crediting every mid-month hire by 0.42: an employee who joined
// 22 June showed 1.26 by August when the correct figure is 0.84, which is what their own
// payslip for that period reported.
export function accruedCredits(dateJoined: string | null) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  let startMonth = 1
  if (dateJoined) {
    const joined = toDate(dateJoined)
    if (joined.getFullYear() > currentYear) return 0
    if (joined.getFullYear() === currentYear) {
      // getMonth() is 0-indexed, so +1 is the join month and +2 the one after it.
      startMonth = joined.getDate() === 1 ? joined.getMonth() + 1 : joined.getMonth() + 2
    }
  }
  const monthsElapsed = Math.max(0, currentMonth - startMonth + 1)
  return Math.min(monthsElapsed * MONTHLY_ACCRUAL, ANNUAL_CREDITS)
}

// The date an employee becomes able to spend accrued credits. Returns null when the hire date
// is missing, which is not the same as "eligible" -- see isLeaveEligible.
//
// Uses setMonth, so an end-of-month hire whose target month is shorter rolls forward a day or
// two (31 Nov does not exist). That is a day or two later than exactly three months and is
// accepted rather than special-cased.
export function leaveEligibleFrom(dateJoined: string | null): Date | null {
  if (!dateJoined) return null
  const eligible = toDate(dateJoined)
  eligible.setMonth(eligible.getMonth() + ELIGIBILITY_MONTHS)
  return eligible
}

// Whether the employee may take PAID leave yet. A missing hire date returns false: without it
// tenure cannot be established, and defaulting to eligible would quietly grant paid leave the
// company policy withholds. The fix is to complete the employee's record, not to assume.
export function isLeaveEligible(dateJoined: string | null, asOf: Date = new Date()): boolean {
  const eligible = leaveEligibleFrom(dateJoined)
  if (!eligible) return false
  return asOf.getTime() >= eligible.getTime()
}

export type LeaveBalance = { accrued: number; used: number; remaining: number }

// Same per-type balance calc LeaveForm.tsx shows while filing a request, exposed here so
// a read-only summary (My Records / admin detail) can show the same numbers.
//
// Late-filed leave does NOT consume a credit. Company policy is that vacation filed with less
// than three days' notice, or sick leave filed more than three days after returning, "will not
// be credited as payable leave" -- the employee is docked for those days instead. Drawing a
// credit down as well would charge them twice for the same absence: once in pay, once in
// entitlement. filed_late is set when the request is submitted (see LeaveForm), so this only
// has to honour it.
export function computeLeaveBalances(
  leaves: { leave_type: string; start_date: string; days_requested: number; filed_late?: boolean }[],
  dateJoined: string | null
): Record<'Sick Leave' | 'Vacation Leave', LeaveBalance> {
  const currentYear = new Date().getFullYear()
  const accrued = accruedCredits(dateJoined)
  const balanceFor = (type: 'Sick Leave' | 'Vacation Leave'): LeaveBalance => {
    const used = leaves
      .filter(l =>
        l.leave_type === type &&
        !l.filed_late &&
        toDate(l.start_date).getFullYear() === currentYear
      )
      .reduce((sum, l) => sum + l.days_requested, 0)
    return { accrued, used, remaining: accrued - used }
  }
  return { 'Sick Leave': balanceFor('Sick Leave'), 'Vacation Leave': balanceFor('Vacation Leave') }
}
