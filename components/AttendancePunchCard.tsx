import { PUNCH_SEQUENCE, PUNCH_LABELS, formatDecimalHours, type PayPeriodAttendanceSummary, type AnyPunchType, type MissingDayEntry } from '@/lib/attendance-shared'
import AttendancePunchRowActions from '@/components/AttendancePunchRowActions'
import AttendancePunchAddAction from '@/components/AttendancePunchAddAction'
import AttendanceAddPunchButton from '@/components/AttendanceAddPunchButton'

const MAROON = '#D9BB6E'

type Props = {
  attendance: PayPeriodAttendanceSummary
  // Calendar days this period with zero punches at all — a day, company holiday, or a
  // filed Leave date is never counted, see lib/attendance-shared.ts's computeAbsentDays.
  absentDays: number
  leadingStat?: { label: string; value: React.ReactNode }
  // Shows per-punch Edit/Delete/Add controls for correcting duplicate/mis-tagged punches or
  // filling in a missing one — only ever passed true from admin-gated surfaces
  // (app/admin/attendance, app/admin/employee/[id] via EmployeeRecordSummary mode="admin").
  // The API route this hits (app/api/attendance-log/route.ts) re-checks Admin itself, so this
  // flag is a UI convenience, not the actual authorization boundary.
  isAdmin?: boolean
  // Whose punches these are — required for the "Add missing punch" action (it inserts on
  // this employee's behalf, distinct from the admin's own session email). Not needed unless
  // isAdmin is also true.
  userEmail?: string
  // Every overtime_requests.ot_date this employee has on file, as plain 'YYYY-MM-DD' — lets
  // each day's "Extra punches" section show whether that punched OT has actually been filed
  // yet. Undefined (not just empty) means the caller didn't fetch overtime_requests at all
  // (e.g. the roster page's per-row card) — the badge is omitted rather than shown as
  // "Not yet filed" for every day, which would be misleading.
  filedOtDateKeys?: Set<string>
  // Workdays this period with zero punches at all — see computeMissingDays. Undefined (not
  // just empty) means the caller didn't compute it (e.g. the self-service page), same
  // "omit rather than show for nobody" convention as filedOtDateKeys above — a day with no
  // punches then renders as no row at all, same as before this prop existed.
  missingDays?: MissingDayEntry[]
}

export default function AttendancePunchCard({ attendance, absentDays, leadingStat, isAdmin, userEmail, filedOtDateKeys, missingDays }: Props) {
  // Merge real punch days with zero-punch placeholder rows into one chronological
  // (most-recent-first, matching groupLogsByDay's own order) list, so a day with no record
  // at all still shows up instead of silently having no row.
  type DisplayEntry = { dateKey: string; group: (typeof attendance.dayGroups)[number] | null; hasLeave: boolean }
  const displayEntries: DisplayEntry[] = [
    ...attendance.dayGroups.map(group => ({ dateKey: group.dateKey, group, hasLeave: false })),
    ...(missingDays ?? []).map(m => ({ dateKey: m.dateKey, group: null, hasLeave: m.hasLeave })),
  ].sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))
  return (
    <>
      <div className="flex flex-wrap gap-8 mb-4">
        {leadingStat && (
          <div>
            <div className="text-xs text-penfix-text-muted">{leadingStat.label}</div>
            <div className="text-lg font-bold" style={{ color: MAROON }}>{leadingStat.value}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-penfix-text-muted">Complete Days</div>
          <div className="text-lg font-bold" style={{ color: MAROON }}>{attendance.completeDays}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Incomplete Days</div>
          <div className="text-lg font-bold" style={{ color: attendance.incompleteDays > 0 ? '#F87171' : MAROON }}>{attendance.incompleteDays}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Absent Days</div>
          <div className="text-lg font-bold" style={{ color: absentDays > 0 ? '#F87171' : MAROON }}>{absentDays}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Late/Flagged Punches</div>
          <div className="text-lg font-bold" style={{ color: attendance.lateCount > 0 ? '#F87171' : MAROON }}>{attendance.lateCount}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Late Hours</div>
          <div className="text-lg font-bold" style={{ color: attendance.lateMinutes > 0 ? '#F87171' : MAROON }}>{formatDecimalHours(attendance.lateMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Undertime Hours</div>
          <div className="text-lg font-bold" style={{ color: attendance.undertimeMinutes > 0 ? '#F87171' : MAROON }}>{formatDecimalHours(attendance.undertimeMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Overtime Hours (punched)</div>
          <div className="text-lg font-bold" style={{ color: attendance.overtimeMinutes > 0 ? '#4ADE80' : MAROON }}>{formatDecimalHours(attendance.overtimeMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Missing Login</div>
          <div className="text-lg font-bold" style={{ color: attendance.missingLoginDays > 0 ? '#F87171' : MAROON }}>{attendance.missingLoginDays} day{attendance.missingLoginDays === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="text-xs text-penfix-text-muted">Missing Logout</div>
          <div className="text-lg font-bold" style={{ color: attendance.missingLogoutDays > 0 ? '#F87171' : MAROON }}>{attendance.missingLogoutDays} day{attendance.missingLogoutDays === 1 ? '' : 's'}</div>
        </div>
      </div>
      <p className="text-xs text-penfix-text-muted mb-4 -mt-2">
        Undertime hours here are derived from early logouts only — separate from any approved undertime request on file.
        Overtime hours here are derived from punched OT In/OT Out pairs after the day&apos;s Login–Logout is already complete — separate from any filed Overtime request, which is what payroll actually pays.
        Absent Days assumes Sunday off and every other day worked, excluding company holidays and filed Leave dates — today and future dates are never counted. A day punched for only the morning or only the afternoon counts as 0.5.
      </p>

      {isAdmin && userEmail && <AttendanceAddPunchButton userEmail={userEmail} />}

      {displayEntries.length === 0 ? (
        <p className="text-sm text-penfix-text-muted">No punches recorded yet this pay period.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {displayEntries.map(entry => {
            if (!entry.group) {
              return (
                <div key={entry.dateKey} className="border border-dashed border-red-200 bg-red-50/30 rounded-lg p-3 flex justify-between items-center">
                  <p className="text-sm font-semibold text-foreground">{entry.dateKey}</p>
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.hasLeave ? '#fbbf24' : '#f87171' }}
                    />
                    {entry.hasLeave ? 'Absent — Leave filed' : 'Absent — No leave filed'}
                  </p>
                </div>
              )
            }
            const day = entry.group
            const missing = PUNCH_SEQUENCE.filter(step => !day.steps[step])
            return (
              <div key={day.dateKey} className="border border-penfix-border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-foreground">{day.dateKey}</p>
                  {missing.length > 0 && (
                    <p className="text-xs font-medium text-red-700">Missing {missing.map(s => PUNCH_LABELS[s]).join(', ')}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PUNCH_SEQUENCE.map(step => {
                    const row = day.steps[step]
                    const evaluation = day.evaluations[step]
                    return (
                      <div key={step} className="border border-penfix-border rounded-lg p-2">
                        <p className="text-xs text-penfix-text-muted">{PUNCH_LABELS[step]}</p>
                        {row ? (
                          <>
                            <p className="text-sm font-medium">
                              {/* timeZone is required, not optional: this is a Server Component, so
                                  toLocaleTimeString formats in the SERVER's zone -- UTC on Vercel --
                                  and every punch rendered 8 hours early. An 08:03 login displayed as
                                  12:03 AM while the lateness flag beside it correctly read
                                  "punched 08:03", because evaluatePunch uses the explicit +8 helper
                                  in lib/attendance-shared.ts. The 'en-PH' locale only picks the
                                  12-hour format; it does not imply a timezone. */}
                              {new Date(row.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                            </p>
                            {row.place_name && <p className="text-xs text-penfix-text-muted">{row.place_name}</p>}
                            {row.latitude !== null && row.longitude !== null && (
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=17/${row.latitude}/${row.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline"
                                style={{ color: MAROON }}
                              >
                                View map
                              </a>
                            )}
                            {evaluation?.reason && (
                              <p className={`text-xs ${evaluation.isLate ? 'text-amber-600' : 'text-orange-600'}`}>
                                ⚠ {evaluation.reason}
                              </p>
                            )}
                            {row.edited_by && <p className="text-xs text-penfix-text-muted">Edited by {row.edited_by}</p>}
                            {isAdmin && <AttendancePunchRowActions id={row.id} punchType={step} createdAtIso={row.created_at} />}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-penfix-text-muted">Missed</p>
                            {isAdmin && userEmail && (
                              <AttendancePunchAddAction userEmail={userEmail} punchType={step} dateKey={day.dateKey} />
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                {day.otPunches.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-penfix-border">
                    <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-2 flex-wrap">
                      <span>
                        OT punches{day.overtimeMinutes > 0 && ` — ${formatDecimalHours(day.overtimeMinutes)} counted as Overtime`}
                      </span>
                      {filedOtDateKeys && (
                        filedOtDateKeys.has(day.dateKey) ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Filed</span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Not yet filed — pending Overtime request</span>
                        )
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {day.otPunches.map(row => (
                        <div key={row.id} className="border border-green-100 bg-green-50/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                          <span className="text-penfix-text-muted">{PUNCH_LABELS[row.punch_type as AnyPunchType]}</span>
                          <span className="font-medium">
                            {new Date(row.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </span>
                          {isAdmin && <AttendancePunchRowActions id={row.id} punchType={row.punch_type as AnyPunchType} createdAtIso={row.created_at} />}
                        </div>
                      ))}
                      {day.otPunches.length % 2 === 1 && (
                        <span className="text-xs text-penfix-text-muted self-center">last one has no closing punch yet — not counted</span>
                      )}
                    </div>
                  </div>
                )}
                {day.extraPunches.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-penfix-border">
                    <p className="text-xs font-medium text-red-700 mb-1">
                      Extra punches of an already-filled step — review for a duplicate/misaligned scan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {day.extraPunches.map(row => (
                        <div key={row.id} className="border border-red-100 bg-red-50/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                          <span className="text-penfix-text-muted">{PUNCH_LABELS[row.punch_type as AnyPunchType]}</span>
                          <span className="font-medium">
                            {new Date(row.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </span>
                          {isAdmin && <AttendancePunchRowActions id={row.id} punchType={row.punch_type as AnyPunchType} createdAtIso={row.created_at} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
