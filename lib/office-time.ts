// Office runs Asia/Manila time, no DST — a fixed offset is sufficient and avoids pulling
// in a timezone library for a single constant. Ported from attendance/lib/attendance-cycle.ts
// (separate deployed app, no shared package — see hr/lib/cookie-domain.ts for the same
// ported-not-imported convention already used in this codebase).
const OFFICE_UTC_OFFSET_HOURS = 8

export function toOfficeLocal(date: Date): Date {
  return new Date(date.getTime() + OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
}

// 'YYYY-MM-DD' in office-local time — used to group punches by calendar day.
export function getOfficeDateKey(date: Date): string {
  return toOfficeLocal(date).toISOString().slice(0, 10)
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

// UTC instant corresponding to office-local midnight of `date`'s office-local day.
export function getOfficeStartOfDayUTC(date: Date): Date {
  const local = toOfficeLocal(date)
  return officeLocalToUTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
}

// UTC instant corresponding to the end of office-local `date`'s day (23:59:59.999).
export function getOfficeEndOfDayUTC(date: Date): Date {
  const local = toOfficeLocal(date)
  return officeLocalToUTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 23, 59, 59, 999)
}
