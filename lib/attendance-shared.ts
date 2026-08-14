import { getOfficeDateKey } from '@/lib/office-time'
import { PH_HOLIDAYS } from '@/lib/ph-holidays'

// Split out from lib/attendance.ts: this half has no "next/headers" import, so client
// components (e.g. AttendancePunchCard, used from the admin attendance list's client
// wrapper) can import these constants/types/pure functions without pulling the
// server-only Supabase fetchers — and their next/headers dependency — into the browser bundle.

export const PUNCH_SEQUENCE = ['login', 'lunchout', 'afterlunchin', 'logout'] as const
export type PunchType = (typeof PUNCH_SEQUENCE)[number]

export const PUNCH_LABELS: Record<PunchType, string> = {
  login: 'Login',
  lunchout: 'Lunch Out',
  afterlunchin: 'After Lunch In',
  logout: 'Logout',
}

export type AttendanceLogRow = {
  id: string
  punch_type: PunchType | 'in' | 'out'
  is_flagged: boolean
  flag_reason: string | null
  place_name: string | null
  // Null for admin-entered punches (app/api/attendance-log/route.ts) — only face-matched
  // punches from the attendance app carry coordinates, so the map link is conditional.
  latitude: number | null
  longitude: number | null
  created_at: string
  // Set by the admin edit action (app/api/attendance-log/route.ts) — null until an admin
  // corrects this punch. Requires attendance/supabase/migrations/052_attendance_admin_edit_delete.sql.
  edited_by: string | null
}

export type DayGroup = {
  dateKey: string
  steps: Record<PunchType, AttendanceLogRow | null>
  // Recomputed from the raw timestamps under current policy — prefer this over the stored
  // is_flagged/flag_reason columns when displaying, see the note above evaluatePunch().
  evaluations: Record<PunchType, PunchEvaluation | null>
  lateCount: number
  lateMinutes: number
  undertimeMinutes: number
  // Punches beyond each step's first occurrence that day — an employee who already
  // completed Login→Lunch Out→After Lunch In→Logout and then punches again (staying for
  // unplanned work) instead of filing an Overtime request. Kept separate from `steps`
  // rather than overwriting it: see groupLogsByDay's comment for why last-write-wins
  // used to silently corrupt the day's real Login/Logout.
  extraPunches: AttendanceLogRow[]
  // Sum of (extraPunches[0]→[1]) + ([2]→[3]) + ... — consecutive extra punches paired
  // chronologically into worked stretches. A trailing unpaired punch (still clocked in,
  // or its closing punch never came) isn't counted.
  overtimeMinutes: number
}

export type PayPeriodAttendanceSummary = {
  dayGroups: DayGroup[]
  completeDays: number
  incompleteDays: number
  lateCount: number
  lateMinutes: number
  undertimeMinutes: number
  overtimeMinutes: number
  missingLoginDays: number
  missingLogoutDays: number
}

// Mirrors attendance/lib/attendance-cycle.ts's policy constants — kept in sync manually
// since the two apps read the same attendance_logs table but don't share a package.
//
// Office policy, as of the 2026-08 rollout. No step carries a grace period — a minute past
// the line is a minute late.
//  - Login is the only step measured against a fixed clock time: 08:00 sharp, so 08:01 is
//    1 minute late.
//  - Lunch Out is NOT scheduled — the office breaks when work allows, so it is never late.
//  - After Lunch In is measured against that day's own Lunch Out: 1 hour of break, exactly.
//    Returning early is fine; only exceeding the hour is late.
//  - Logout is 17:00. Leaving early is undertime. Staying past 17:00 is NOT overtime unless
//    separately filed, so it is neither flagged nor credited.
//
// Lateness is recomputed here from the raw timestamps rather than read from the stored
// is_flagged/flag_reason columns: those were written at punch time, so rows predating a
// policy change (or added by an Admin without the day's Lunch Out to hand) would otherwise
// keep showing stale reasons. Recomputing keeps every surface consistent without a backfill.
const LOGIN_EXPECTED = { hour: 8, minute: 0 }
const LOGOUT_EXPECTED_MINUTES = 17 * 60
export const LUNCH_BREAK_MINUTES = 60

export type PunchEvaluation = {
  isLate: boolean
  lateMinutes: number
  undertimeMinutes: number
  // Human-readable note for display — set for undertime too, even though that isn't a flag.
  reason: string | null
}

const NO_DEVIATION: PunchEvaluation = { isLate: false, lateMinutes: 0, undertimeMinutes: 0, reason: null }

function hhmm(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// `lunchOutIso` is that day's Lunch Out punch — required to grade an After Lunch In. When
// absent the break can't be measured, so the punch is left unflagged rather than guessed at.
export function evaluatePunch(
  step: PunchType,
  createdAtIso: string,
  lunchOutIso?: string | null
): PunchEvaluation {
  const actual = officeLocalMinutes(createdAtIso)
  const clock = actual

  if (step === 'login') {
    const over = actual - (LOGIN_EXPECTED.hour * 60 + LOGIN_EXPECTED.minute)
    if (over <= 0) return NO_DEVIATION
    const expectedLabel = hhmm(LOGIN_EXPECTED.hour * 60 + LOGIN_EXPECTED.minute)
    return {
      isLate: true,
      lateMinutes: over,
      undertimeMinutes: 0,
      reason: `Late Login — expected ${expectedLabel}, punched ${hhmm(clock)} (${formatMinutes(over)} late)`,
    }
  }

  if (step === 'lunchout') return NO_DEVIATION

  if (step === 'afterlunchin') {
    if (!lunchOutIso) return NO_DEVIATION
    const breakMinutes = Math.round((Date.parse(createdAtIso) - Date.parse(lunchOutIso)) / 60000)
    if (breakMinutes <= LUNCH_BREAK_MINUTES) return NO_DEVIATION
    const over = breakMinutes - LUNCH_BREAK_MINUTES
    return {
      isLate: true,
      lateMinutes: over,
      undertimeMinutes: 0,
      reason: `Break over by ${formatMinutes(over)} — ${LUNCH_BREAK_MINUTES}m allowed, took ${formatMinutes(breakMinutes)}`,
    }
  }

  // logout
  const early = LOGOUT_EXPECTED_MINUTES - actual
  if (early <= 0) return NO_DEVIATION
  return {
    isLate: false,
    lateMinutes: 0,
    undertimeMinutes: early,
    reason: `Early Logout — ${formatMinutes(early)} undertime (expected ${hhmm(LOGOUT_EXPECTED_MINUTES)}, punched ${hhmm(clock)})`,
  }
}

const OFFICE_UTC_OFFSET_HOURS = 8

// Wall-clock minutes past office-local midnight — for DISPLAY only.
function officeLocalMinutes(iso: string): number {
  const local = new Date(new Date(iso).getTime() + OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

// Recomputes is_flagged/flag_reason for a given step + timestamp, so the admin edit/insert
// action (app/api/attendance-log/route.ts) writes columns consistent with current policy
// instead of leaving the original punch-time flag stale. `lunchOutIso` is optional there —
// that route handles one row at a time and has no day context — so a manually added After
// Lunch In stores no flag. Display doesn't depend on it: groupLogsByDay below recomputes
// every punch with the day's Lunch Out to hand.
export function evaluatePunchLateness(
  step: PunchType,
  createdAtIso: string,
  lunchOutIso?: string | null
): { isFlagged: boolean; reason: string | null } {
  const evaluation = evaluatePunch(step, createdAtIso, lunchOutIso)
  return { isFlagged: evaluation.isLate, reason: evaluation.isLate ? evaluation.reason : null }
}

export function formatMinutes(total: number): string {
  if (total <= 0) return '0m'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Groups punches by office-local calendar day, most recent first — ported from
// attendance/app/my-logs/MyLogsClient.tsx's grouping logic.
//
// Each step keeps its FIRST punch of the day, not its last: a day only has one real
// Login and one real Logout, so once a step is filled, a later punch of the same type
// is an employee staying for extra work after already completing the day (or double-
// punching by mistake), not a correction — those go to extraPunches instead. This used
// to be `group.steps[row.punch_type] = row` unconditionally, so a same-day re-login for
// unplanned overtime silently overwrote the real morning Login with the evening one,
// which then got graded as a huge "Late Login" against the 08:00 line instead of
// crediting the extra hours worked (found 2026-08-14 on a real employee's record, whose
// Late Hours read 13h57m because their evening OT punch had replaced their actual login).
//
// Two passes: After Lunch In is graded against that day's Lunch Out, which isn't
// necessarily assigned yet while the first pass is still walking the rows (an Admin can
// correct a punch's time so the stored order no longer matches the step order).
export function groupLogsByDay(rows: AttendanceLogRow[]): DayGroup[] {
  const byDate = new Map<string, DayGroup>()
  // Defensive sort — first-occurrence-wins below depends on chronological order, and
  // callers already query with `.order('created_at')` but this keeps the function
  // correct on its own regardless of what order it's handed.
  const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  for (const row of sorted) {
    const dateKey = getOfficeDateKey(new Date(row.created_at))
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        steps: { login: null, lunchout: null, afterlunchin: null, logout: null },
        evaluations: { login: null, lunchout: null, afterlunchin: null, logout: null },
        lateCount: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        extraPunches: [],
        overtimeMinutes: 0,
      })
    }
    const group = byDate.get(dateKey)!
    if ((PUNCH_SEQUENCE as readonly string[]).includes(row.punch_type)) {
      const step = row.punch_type as PunchType
      if (!group.steps[step]) group.steps[step] = row
      else group.extraPunches.push(row)
    }
  }

  for (const group of byDate.values()) {
    const lunchOutIso = group.steps.lunchout?.created_at ?? null
    for (const step of PUNCH_SEQUENCE) {
      const row = group.steps[step]
      if (!row) continue
      const evaluation = evaluatePunch(step, row.created_at, lunchOutIso)
      group.evaluations[step] = evaluation
      if (evaluation.isLate) group.lateCount += 1
      group.lateMinutes += evaluation.lateMinutes
      group.undertimeMinutes += evaluation.undertimeMinutes
    }

    for (let i = 0; i + 1 < group.extraPunches.length; i += 2) {
      const startMs = Date.parse(group.extraPunches[i].created_at)
      const endMs = Date.parse(group.extraPunches[i + 1].created_at)
      if (endMs > startMs) group.overtimeMinutes += Math.round((endMs - startMs) / 60000)
    }
  }

  return Array.from(byDate.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
}

// A day only counts as "incomplete" once it's over — today (still in progress) isn't
// penalized for missing steps that just haven't happened yet. Same rule applies to the
// missing-login/missing-logout aggregates.
export function summarizePayPeriod(rows: AttendanceLogRow[], todayKey: string): PayPeriodAttendanceSummary {
  const dayGroups = groupLogsByDay(rows)
  let completeDays = 0
  let incompleteDays = 0
  let lateCount = 0
  let lateMinutes = 0
  let undertimeMinutes = 0
  let overtimeMinutes = 0
  let missingLoginDays = 0
  let missingLogoutDays = 0
  for (const day of dayGroups) {
    const missingSteps = PUNCH_SEQUENCE.some(step => !day.steps[step])
    if (!missingSteps) completeDays++
    else if (day.dateKey !== todayKey) incompleteDays++
    lateCount += day.lateCount
    lateMinutes += day.lateMinutes
    undertimeMinutes += day.undertimeMinutes
    overtimeMinutes += day.overtimeMinutes
    if (day.dateKey !== todayKey) {
      if (!day.steps.login) missingLoginDays++
      if (!day.steps.logout) missingLogoutDays++
    }
  }
  return { dayGroups, completeDays, incompleteDays, lateCount, lateMinutes, undertimeMinutes, overtimeMinutes, missingLoginDays, missingLogoutDays }
}

// Plain office-local calendar date, same arithmetic as getOfficeDateKey above (which is
// itself plain midnight-to-midnight, no overnight-shift adjustment) — kept as its own
// small local helper rather than importing getOfficeDateKey directly, matching
// lib/employee-records.ts's private officeCalendarDate (same duplication, same reason:
// this file intentionally keeps its own tiny offset-only helpers local to where they're
// used rather than sharing a single one across files).
function officeCalendarDateKey(d: Date): string {
  const local = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
}

// Default rest day assumed below: Sunday off, every other calendar day (Saturday
// included) expected to be worked. This matches the actual punch pattern seen across the
// crew — Saturdays are routinely punched as ordinary full days, not occasional overtime —
// rather than a generic Mon–Fri assumption. If a specific team's real schedule differs,
// this is the one place to change it (or extend the signature to take a per-employee rule).
const REST_DAY_OF_WEEK = 0 // Date#getUTCDay(): 0 = Sunday

// Calendar dates in [periodStart, periodEnd] that were expected to be worked but have
// zero punches at all — not derivable from dayGroups alone: a day with no punches never
// gets a group in the first place (see groupLogsByDay), so it's invisible to
// completeDays/incompleteDays. Excludes the rest day, company holidays (lib/ph-holidays.ts),
// dates covered by a filed Leave request, and today/future dates (can't call a day absent
// before it's finished, same rule incompleteDays already follows).
//
// leaveDateKeys is every 'YYYY-MM-DD' an employee's leave_requests cover — leave_requests
// has no approval workflow in this app (see getRequestsOverviewForPeriod's comment), so a
// filed leave already counts, same as it does for "relevant this period" there.
export function computeAbsentDays(
  periodStart: Date,
  periodEnd: Date,
  dayGroups: DayGroup[],
  leaveDateKeys: Set<string>,
  todayKey: string
): string[] {
  const punchedKeys = new Set(dayGroups.map(g => g.dateKey))
  const absentDates: string[] = []
  const oneDayMs = 24 * 60 * 60 * 1000
  for (let t = periodStart.getTime(); t <= periodEnd.getTime(); t += oneDayMs) {
    const local = new Date(t + 8 * 60 * 60 * 1000)
    const dateKey = officeCalendarDateKey(new Date(t))
    if (dateKey >= todayKey) continue
    if (local.getUTCDay() === REST_DAY_OF_WEEK) continue
    if (dateKey in PH_HOLIDAYS) continue
    if (leaveDateKeys.has(dateKey)) continue
    if (punchedKeys.has(dateKey)) continue
    absentDates.push(dateKey)
  }
  return absentDates
}

// Expands an employee's leave_requests into the set of individual dates they cover, for
// computeAbsentDays above. Inclusive of both start_date and end_date.
export function expandLeaveDateKeys(leaves: { start_date: string; end_date: string }[]): Set<string> {
  const keys = new Set<string>()
  for (const leave of leaves) {
    let cursor = new Date(leave.start_date + 'T00:00:00Z')
    const end = new Date(leave.end_date + 'T00:00:00Z')
    while (cursor.getTime() <= end.getTime()) {
      keys.add(cursor.toISOString().slice(0, 10))
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  return keys
}
