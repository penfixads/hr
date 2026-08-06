import { getOfficeDateKey } from '@/lib/office-time'

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
}

export type PayPeriodAttendanceSummary = {
  dayGroups: DayGroup[]
  completeDays: number
  incompleteDays: number
  lateCount: number
  lateMinutes: number
  undertimeMinutes: number
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

  if (step === 'login') {
    const over = actual - (LOGIN_EXPECTED.hour * 60 + LOGIN_EXPECTED.minute)
    if (over <= 0) return NO_DEVIATION
    const expectedLabel = hhmm(LOGIN_EXPECTED.hour * 60 + LOGIN_EXPECTED.minute)
    return {
      isLate: true,
      lateMinutes: over,
      undertimeMinutes: 0,
      reason: `Late Login — expected ${expectedLabel}, punched ${hhmm(actual)}`,
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
    reason: `Early Logout — ${formatMinutes(early)} undertime (expected ${hhmm(LOGOUT_EXPECTED_MINUTES)}, punched ${hhmm(actual)})`,
  }
}

const OFFICE_UTC_OFFSET_HOURS = 8

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
// Two passes: After Lunch In is graded against that day's Lunch Out, which isn't
// necessarily assigned yet while the first pass is still walking the rows (an Admin can
// correct a punch's time so the stored order no longer matches the step order).
export function groupLogsByDay(rows: AttendanceLogRow[]): DayGroup[] {
  const byDate = new Map<string, DayGroup>()
  for (const row of rows) {
    const dateKey = getOfficeDateKey(new Date(row.created_at))
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        steps: { login: null, lunchout: null, afterlunchin: null, logout: null },
        evaluations: { login: null, lunchout: null, afterlunchin: null, logout: null },
        lateCount: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
    }
    const group = byDate.get(dateKey)!
    if ((PUNCH_SEQUENCE as readonly string[]).includes(row.punch_type)) {
      group.steps[row.punch_type as PunchType] = row
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
  let missingLoginDays = 0
  let missingLogoutDays = 0
  for (const day of dayGroups) {
    const missingSteps = PUNCH_SEQUENCE.some(step => !day.steps[step])
    if (!missingSteps) completeDays++
    else if (day.dateKey !== todayKey) incompleteDays++
    lateCount += day.lateCount
    lateMinutes += day.lateMinutes
    undertimeMinutes += day.undertimeMinutes
    if (day.dateKey !== todayKey) {
      if (!day.steps.login) missingLoginDays++
      if (!day.steps.logout) missingLogoutDays++
    }
  }
  return { dayGroups, completeDays, incompleteDays, lateCount, lateMinutes, undertimeMinutes, missingLoginDays, missingLogoutDays }
}
