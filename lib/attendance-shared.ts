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
  created_at: string
  // Set by the admin edit action (app/api/attendance-log/route.ts) — null until an admin
  // corrects this punch. Requires attendance/supabase/migrations/052_attendance_admin_edit_delete.sql.
  edited_by: string | null
}

export type DayGroup = {
  dateKey: string
  steps: Record<PunchType, AttendanceLogRow | null>
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

// Mirrors attendance/lib/attendance-cycle.ts's EXPECTED_TIMES — kept in sync manually
// since the two apps read the same attendance_logs table but don't share a package.
// Used here only to turn stored punches into hour-based summaries for display; the
// authoritative is_flagged/flag_reason values are still set at punch time by the
// attendance app itself.
const EXPECTED_TIMES: Record<PunchType, { hour: number; minute: number; graceMinutes: number }> = {
  login: { hour: 8, minute: 0, graceMinutes: 15 },
  lunchout: { hour: 12, minute: 0, graceMinutes: 15 },
  afterlunchin: { hour: 13, minute: 0, graceMinutes: 15 },
  logout: { hour: 17, minute: 0, graceMinutes: 30 },
}

const OFFICE_UTC_OFFSET_HOURS = 8

function officeLocalMinutes(iso: string): number {
  const local = new Date(new Date(iso).getTime() + OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

// Recomputes is_flagged/flag_reason for a given step + timestamp — mirrors
// attendance/lib/attendance-cycle.ts's evaluateLateness(). Exported so the admin edit
// action (app/api/attendance-log/route.ts) can keep these columns consistent when it
// changes a punch's type or time, instead of leaving the original punch-time flag stale.
export function evaluatePunchLateness(step: PunchType, createdAtIso: string): { isFlagged: boolean; reason: string | null } {
  const expected = EXPECTED_TIMES[step]
  const lateBy = officeLocalMinutes(createdAtIso) - (expected.hour * 60 + expected.minute + expected.graceMinutes)
  if (lateBy <= 0) return { isFlagged: false, reason: null }
  const expectedLabel = `${String(expected.hour).padStart(2, '0')}:${String(expected.minute).padStart(2, '0')}`
  const local = new Date(new Date(createdAtIso).getTime() + OFFICE_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  const actualLabel = local.toISOString().slice(11, 16)
  return { isFlagged: true, reason: `Late ${PUNCH_LABELS[step]} — expected ~${expectedLabel}, punched ${actualLabel}` }
}

// Minutes late for any flagged step (login, back-from-lunch, etc.) past its grace
// window. 0 for on-time or unrecognized punch types.
function lateMinutesFor(row: AttendanceLogRow): number {
  if (!(PUNCH_SEQUENCE as readonly string[]).includes(row.punch_type)) return 0
  const step = row.punch_type as PunchType
  const expected = EXPECTED_TIMES[step]
  const lateBy = officeLocalMinutes(row.created_at) - (expected.hour * 60 + expected.minute + expected.graceMinutes)
  return lateBy > 0 ? lateBy : 0
}

// Minutes undertime for an early logout (past its grace window, in the early
// direction). Deliberately scoped to the logout step only — this is a display-only
// derivation from actual punches, separate from the self-filed undertime_requests
// table which remains the record of approved undertime.
function undertimeMinutesFor(row: AttendanceLogRow): number {
  if (row.punch_type !== 'logout') return 0
  const expected = EXPECTED_TIMES.logout
  const earlyBy = (expected.hour * 60 + expected.minute - expected.graceMinutes) - officeLocalMinutes(row.created_at)
  return earlyBy > 0 ? earlyBy : 0
}

export function formatMinutes(total: number): string {
  if (total <= 0) return '0m'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Groups punches by office-local calendar day, most recent first — ported from
// attendance/app/my-logs/MyLogsClient.tsx's grouping logic.
export function groupLogsByDay(rows: AttendanceLogRow[]): DayGroup[] {
  const byDate = new Map<string, DayGroup>()
  for (const row of rows) {
    const dateKey = getOfficeDateKey(new Date(row.created_at))
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        steps: { login: null, lunchout: null, afterlunchin: null, logout: null },
        lateCount: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
      })
    }
    const group = byDate.get(dateKey)!
    if ((PUNCH_SEQUENCE as readonly string[]).includes(row.punch_type)) {
      group.steps[row.punch_type as PunchType] = row
      if (row.is_flagged) group.lateCount += 1
      group.lateMinutes += lateMinutesFor(row)
      group.undertimeMinutes += undertimeMinutesFor(row)
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
