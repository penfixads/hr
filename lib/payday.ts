import { toOfficeLocal, officeLocalToUTC } from './office-time'

export type PayPeriod = { start: Date; end: Date; label: string }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastDayOfMonth(year: number, month: number) {
  // day 0 of the following month = last day of this one (month is 0-indexed, UTC-safe).
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

// Semi-monthly pay periods: 1st-15th, and 16th-end of month, in office-local time.
export function getCurrentPayPeriod(nowUtc: Date = new Date()): PayPeriod {
  const local = toOfficeLocal(nowUtc)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()
  const lastDay = lastDayOfMonth(year, month)

  const startDay = day <= 15 ? 1 : 16
  const endDay = day <= 15 ? 15 : lastDay

  return {
    start: officeLocalToUTC(year, month, startDay),
    end: officeLocalToUTC(year, month, endDay, 23, 59, 59, 999),
    label: `${MONTH_NAMES[month]} ${startDay}–${endDay}, ${year}`,
  }
}

// Payday falls one day before each cutoff: the 14th, and the day before the last day of
// the month (e.g. the 29th in a 30-day month). Returns the next upcoming payday from now.
export function getNextPayday(nowUtc: Date = new Date()): Date {
  const local = toOfficeLocal(nowUtc)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()
  const secondPayday = lastDayOfMonth(year, month) - 1

  if (day <= 14) return officeLocalToUTC(year, month, 14)
  if (day <= secondPayday) return officeLocalToUTC(year, month, secondPayday)

  // Past both paydays this month — roll into next month's 14th.
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  return officeLocalToUTC(nextYear, nextMonth, 14)
}

// Formats a UTC instant back into its office-local calendar day — shifts to office-local
// first (same convention as getOfficeDateKey) so the label matches the day it represents
// regardless of the server's own timezone.
export function formatOfficeDate(date: Date): string {
  const local = toOfficeLocal(date)
  return `${MONTH_NAMES[local.getUTCMonth()]} ${local.getUTCDate()}, ${local.getUTCFullYear()}`
}
