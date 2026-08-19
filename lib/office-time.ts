// Office runs Asia/Manila time, no DST — a fixed offset is sufficient and avoids pulling
// in a timezone library for a single constant. Ported from attendance/lib/attendance-cycle.ts
// (separate deployed app, no shared package — see hr/lib/cookie-domain.ts for the same
// ported-not-imported convention already used in this codebase).
const OFFICE_UTC_OFFSET_HOURS = 8

export function toOfficeLocal(date: Date): Date {
  return new Date(date.getTime() + OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
}

// An attendance day runs 05:00 -> 05:00 office-local, NOT midnight -> midnight, so that
// an overnight field install and the punch-out on the way home stay on one day. Mirrors
// attendance/lib/attendance-cycle.ts's OFFICE_DAY_START_HOUR — kept in sync by hand, same
// as the policy constants in lib/attendance-shared.ts. Change one, change the other, or
// the two apps will disagree about which day a small-hours punch belongs to.
export const OFFICE_DAY_START_HOUR = 5

// Office-local time shifted back by the day-start hour, so a punch between midnight and
// OFFICE_DAY_START_HOUR lands on the previous calendar date.
function toShiftLocal(date: Date): Date {
  return new Date(toOfficeLocal(date).getTime() - OFFICE_DAY_START_HOUR * 60 * 60 * 1000)
}

// 'YYYY-MM-DD' of the shift a punch belongs to — used to group punches by day. Note this
// is deliberately NOT the calendar date for small-hours punches: a 02:25 punch returns the
// previous date. Pay-period boundary math uses officeLocalToUTC below and is unaffected.
export function getOfficeDateKey(date: Date): string {
  return toShiftLocal(date).toISOString().slice(0, 10)
}

// UTC instant for a given office-local wall-clock date/time (month is 0-indexed, matching
// the built-in Date constructor). Used to convert an office-local calendar day (e.g. "the
// 1st of the current pay period") into the UTC instant needed for Supabase range queries.
export function officeLocalToUTC(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0, ms = 0
): Date {
  const localMs = Date.UTC(year, month, day, hour, minute, second, ms)
  return new Date(localMs - OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
}

// UTC instant of the OFFICE_DAY_START_HOUR boundary that opens `date`'s shift day.
export function getOfficeStartOfDayUTC(date: Date): Date {
  const shift = toShiftLocal(date)
  return officeLocalToUTC(
    shift.getUTCFullYear(), shift.getUTCMonth(), shift.getUTCDate(), OFFICE_DAY_START_HOUR
  )
}

// UTC instant of the last millisecond of `date`'s shift day — i.e. 04:59:59.999 on the
// FOLLOWING calendar date, since a shift day ends where the next one starts.
export function getOfficeEndOfDayUTC(date: Date): Date {
  const shift = toShiftLocal(date)
  return officeLocalToUTC(
    shift.getUTCFullYear(), shift.getUTCMonth(), shift.getUTCDate() + 1,
    OFFICE_DAY_START_HOUR - 1, 59, 59, 999
  )
}
