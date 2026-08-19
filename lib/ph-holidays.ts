export type HolidayType = 'regular' | 'special'

export type Holiday = { name: string; type: HolidayType }

// Regular + special (non-working) holidays used to shift payday off a Sunday/holiday
// (lib/payday.ts) and to exclude holiday dates from Absent Days (lib/attendance-shared.ts).
// Keyed 'YYYY-MM-DD'. Excludes "special working day" (e.g. EDSA anniversary) since those
// don't move payday or count as a day off. Movable Islamic holidays (Eidul Fitr, Eidul
// Adha) are proclaimed only weeks ahead based on moon sighting — add them here (as
// 'regular') once announced. Source: Proclamation 1006 (s. 2025) for 2026 dates.
//
// Needs a new year's entries added annually — nothing breaks if a year is missing,
// the payday for that year just won't shift.
//
// NOTE: the Holidays calendar (app/admin/holidays, and the dashboard's Calendar widget
// on app/admin/page.tsx) does NOT read this file — it reads the admin-editable
// `company_holidays` Supabase table instead (see supabase/CATCHUP_company_holidays.sql,
// seeded from this same 2026 list), so an Admin can appoint/move a holiday from the UI
// without a redeploy. That means this file and the DB table can drift: if an Admin adds
// or moves a holiday in the calendar, payday-shifting and Absent Days here won't reflect
// it until this file is also edited to match.
export const PH_HOLIDAY_DETAILS: Record<string, Holiday> = {
  '2026-01-01': { name: "New Year's Day", type: 'regular' },
  '2026-02-17': { name: 'Chinese New Year', type: 'special' },
  '2026-04-02': { name: 'Maundy Thursday', type: 'regular' },
  '2026-04-03': { name: 'Good Friday', type: 'regular' },
  '2026-04-04': { name: 'Black Saturday', type: 'special' },
  '2026-04-09': { name: 'Araw ng Kagitingan', type: 'regular' },
  '2026-05-01': { name: 'Labor Day', type: 'regular' },
  '2026-06-12': { name: 'Independence Day', type: 'regular' },
  '2026-08-21': { name: 'Ninoy Aquino Day', type: 'special' },
  '2026-08-31': { name: 'National Heroes Day', type: 'regular' },
  '2026-11-01': { name: "All Saints' Day", type: 'special' },
  '2026-11-02': { name: "All Souls' Day", type: 'special' },
  '2026-11-30': { name: 'Bonifacio Day', type: 'regular' },
  '2026-12-08': { name: 'Feast of the Immaculate Conception', type: 'special' },
  '2026-12-24': { name: 'Christmas Eve', type: 'special' },
  '2026-12-25': { name: 'Christmas Day', type: 'regular' },
  '2026-12-30': { name: 'Rizal Day', type: 'regular' },
  '2026-12-31': { name: 'Last Day of the Year', type: 'special' },
}

// Back-compat flat name lookup — lib/payday.ts and lib/attendance-shared.ts only ever
// need "is this date a holiday" (`in PH_HOLIDAYS`), not the classification.
export const PH_HOLIDAYS: Record<string, string> = Object.fromEntries(
  Object.entries(PH_HOLIDAY_DETAILS).map(([date, h]) => [date, h.name])
)
