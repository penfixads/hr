// Regular + special (non-working) holidays used to shift payday off a Sunday/holiday
// (lib/payday.ts). Keyed 'YYYY-MM-DD'. Excludes "special working day" (e.g. EDSA
// anniversary) since those don't move payday. Movable Islamic holidays (Eidul Fitr,
// Eidul Adha) are proclaimed only weeks ahead based on moon sighting — add them here
// once announced. Source: Proclamation 1006 (s. 2025) for 2026 dates.
//
// Needs a new year's entries added annually — nothing breaks if a year is missing,
// the payday for that year just won't shift for unlisted holidays.
export const PH_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-02-17': 'Chinese New Year',
  '2026-04-02': 'Maundy Thursday',
  '2026-04-03': 'Good Friday',
  '2026-04-04': 'Black Saturday',
  '2026-04-09': 'Araw ng Kagitingan',
  '2026-05-01': 'Labor Day',
  '2026-06-12': 'Independence Day',
  '2026-08-21': 'Ninoy Aquino Day',
  '2026-08-31': 'National Heroes Day',
  '2026-11-01': "All Saints' Day",
  '2026-11-02': "All Souls' Day",
  '2026-11-30': 'Bonifacio Day',
  '2026-12-08': 'Feast of the Immaculate Conception',
  '2026-12-24': 'Christmas Eve',
  '2026-12-25': 'Christmas Day',
  '2026-12-30': 'Rizal Day',
  '2026-12-31': 'Last Day of the Year',
}
