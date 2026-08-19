import { toOfficeLocal, officeLocalToUTC } from './office-time'
import { PH_HOLIDAYS } from './ph-holidays'

// `end` is the attendance cutoff (the last day actually worked in this cycle) — do not
// widen it to cover payday; attendance-log queries (app/my-records, app/admin/employee,
// app/admin/attendance) rely on it stopping exactly there, one day before the next cycle's
// first attendance day. `payday` is exposed separately for callers that need "this period
// is still current through its own payday" (see getRequestsOverviewForPeriod's resolved_at
// bound in lib/employee-records.ts) — getPayCycle already treats the cycle as current up to
// and including payday, so anything the cycle covers (like a same-day CA/loan approval)
// should still be considered "this period" even though `end` itself hasn't reached that far.
export type PayPeriod = { start: Date; end: Date; payday: Date; label: string }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastDayOfMonth(year: number, month: number) {
  // day 0 of the following month = last day of this one (month is 0-indexed, UTC-safe).
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

// Plain calendar date (no time-of-day meaning) — used only for day-of-week/holiday
// lookups and date arithmetic, kept separate from office-local wall-clock instants.
function calDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isHoliday(date: Date): boolean {
  return dateKey(date) in PH_HOLIDAYS
}

// Payday shifts one calendar day earlier for each Sunday/holiday it lands on, repeating
// until it clears both (handles a holiday falling right after a Sunday, etc).
function adjustPayday(date: Date): Date {
  let d = date
  while (d.getUTCDay() === 0 || isHoliday(d)) d = addDays(d, -1)
  return d
}

// Mid-month payday: nominally the 14th (one day before the 15th), shifted earlier off
// a Sunday/holiday.
function paydayA(year: number, month: number): Date {
  return adjustPayday(calDate(year, month, 14))
}

// End-of-month payday: one day before the month's last day, shifted earlier off a
// Sunday/holiday (e.g. the 30th in a 31-day month, the 29th in a 30-day month).
function paydayB(year: number, month: number): Date {
  return adjustPayday(calDate(year, month, lastDayOfMonth(year, month) - 1))
}

// Attendance cutoff: one calendar day before the (already Sunday/holiday-shifted)
// payday — not independently re-shifted itself.
function cutoffA(year: number, month: number): Date {
  return addDays(paydayA(year, month), -1)
}

function cutoffB(year: number, month: number): Date {
  return addDays(paydayB(year, month), -1)
}

type PayCycle = { start: Date; end: Date; payday: Date }

// The attendance cycle currently containing `today` (an office-local calendar date).
// Every calendar day belongs to exactly one cycle: a cycle runs from the day after the
// previous cutoff through this cycle's own cutoff (one day before its payday) — so the
// payday date itself is already the first day of the *next* cycle, not the last day of
// this one.
function getPayCycle(today: Date): PayCycle {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()

  // Boundary is the payday itself, not the cutoff (payday - 1): the period being paid
  // out needs to stay "current" through its own payday, so whoever is running payroll
  // that day can still see the attendance they're paying for. It only rolls into the
  // next cycle starting the day after payday. cutA/cutB (the actual last-attendance-day)
  // are unchanged — only this display/query rollover point shifts by one day.
  const cutA = cutoffA(year, month)
  const payA = paydayA(year, month)
  if (today.getTime() <= payA.getTime()) {
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevCutB = cutoffB(prevYear, prevMonth)
    return { start: addDays(prevCutB, 1), end: cutA, payday: payA }
  }

  const cutB = cutoffB(year, month)
  const payB = paydayB(year, month)
  if (today.getTime() <= payB.getTime()) {
    return { start: addDays(cutA, 1), end: cutB, payday: payB }
  }

  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  const nextCutA = cutoffA(nextYear, nextMonth)
  return { start: addDays(cutB, 1), end: nextCutA, payday: paydayA(nextYear, nextMonth) }
}

function labelFor(start: Date, end: Date): string {
  const startMonth = MONTH_NAMES[start.getUTCMonth()]
  const endMonth = MONTH_NAMES[end.getUTCMonth()]
  const sameMonth = startMonth === endMonth && start.getUTCFullYear() === end.getUTCFullYear()
  const startPart = sameMonth ? `${startMonth} ${start.getUTCDate()}` : `${startMonth} ${start.getUTCDate()}, ${start.getUTCFullYear()}`
  const endPart = sameMonth ? `${end.getUTCDate()}, ${end.getUTCFullYear()}` : `${endMonth} ${end.getUTCDate()}, ${end.getUTCFullYear()}`
  return `${startPart}–${endPart}`
}

// Attendance cycle covering "day after last cutoff" through "this cycle's cutoff"
// (one day before its payday), in office-local time. See lib/ph-holidays.ts for the
// Sunday/holiday shift applied to paydays.
export function getCurrentPayPeriod(nowUtc: Date = new Date()): PayPeriod {
  const today = toOfficeLocal(nowUtc)
  const cycle = getPayCycle(calDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  return {
    start: officeLocalToUTC(cycle.start.getUTCFullYear(), cycle.start.getUTCMonth(), cycle.start.getUTCDate()),
    end: officeLocalToUTC(cycle.end.getUTCFullYear(), cycle.end.getUTCMonth(), cycle.end.getUTCDate(), 23, 59, 59, 999),
    payday: officeLocalToUTC(cycle.payday.getUTCFullYear(), cycle.payday.getUTCMonth(), cycle.payday.getUTCDate(), 23, 59, 59, 999),
    label: labelFor(cycle.start, cycle.end),
  }
}

// Next upcoming payday. Note: on the payday itself, attendance has already rolled into
// the following cycle (its cutoff is the day before), so this returns the payday after
// today's, not today's own.
export function getNextPayday(nowUtc: Date = new Date()): Date {
  const today = toOfficeLocal(nowUtc)
  const cycle = getPayCycle(calDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  return officeLocalToUTC(cycle.payday.getUTCFullYear(), cycle.payday.getUTCMonth(), cycle.payday.getUTCDate())
}

// Formats a UTC instant back into its office-local calendar day — shifts to office-local
// first (same convention as getOfficeDateKey) so the label matches the day it represents
// regardless of the server's own timezone.
export function formatOfficeDate(date: Date): string {
  const local = toOfficeLocal(date)
  return `${MONTH_NAMES[local.getUTCMonth()]} ${local.getUTCDate()}, ${local.getUTCFullYear()}`
}

// Counts paydays that have occurred strictly after `fromDate` and on/before `toDate` —
// used on the home page (app/page.tsx) to ESTIMATE a loan's remaining balance as
// `amount - installment * paydaysElapsed`, since there is no actual per-payday deduction
// ledger to read the real paid-off amount from. This is only ever a display estimate —
// it assumes every payday's deduction went through as scheduled with no skips or
// adjustments, which won't always be true.
export function countPaydaysSince(fromDate: Date, toDate: Date = new Date()): number {
  let count = 0
  let cursor = fromDate
  // Bounded to 5 years of semi-monthly paydays — a loan sitting unpaid that long is not
  // a case this estimate needs to keep iterating for.
  for (let i = 0; i < 120; i++) {
    const next = getNextPayday(cursor)
    if (next.getTime() > toDate.getTime()) break
    count++
    cursor = new Date(next.getTime() + 24 * 60 * 60 * 1000)
  }
  return count
}
