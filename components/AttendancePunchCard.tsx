import { PUNCH_SEQUENCE, PUNCH_LABELS, formatDecimalHours, type PayPeriodAttendanceSummary, type PunchType } from '@/lib/attendance-shared'
import AttendancePunchRowActions from '@/components/AttendancePunchRowActions'
import AttendancePunchAddAction from '@/components/AttendancePunchAddAction'
import AttendanceAddPunchButton from '@/components/AttendanceAddPunchButton'

const MAROON = '#4A0000'

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
}

export default function AttendancePunchCard({ attendance, absentDays, leadingStat, isAdmin, userEmail }: Props) {
  return (
    <>
      <div className="flex flex-wrap gap-8 mb-4">
        {leadingStat && (
          <div>
            <div className="text-xs text-gray-500">{leadingStat.label}</div>
            <div className="text-lg font-bold" style={{ color: MAROON }}>{leadingStat.value}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-gray-500">Complete Days</div>
          <div className="text-lg font-bold" style={{ color: MAROON }}>{attendance.completeDays}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Incomplete Days</div>
          <div className="text-lg font-bold" style={{ color: attendance.incompleteDays > 0 ? '#b91c1c' : MAROON }}>{attendance.incompleteDays}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Absent Days</div>
          <div className="text-lg font-bold" style={{ color: absentDays > 0 ? '#b91c1c' : MAROON }}>{absentDays}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Late/Flagged Punches</div>
          <div className="text-lg font-bold" style={{ color: attendance.lateCount > 0 ? '#b91c1c' : MAROON }}>{attendance.lateCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Late Hours</div>
          <div className="text-lg font-bold" style={{ color: attendance.lateMinutes > 0 ? '#b91c1c' : MAROON }}>{formatDecimalHours(attendance.lateMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Undertime Hours</div>
          <div className="text-lg font-bold" style={{ color: attendance.undertimeMinutes > 0 ? '#b91c1c' : MAROON }}>{formatDecimalHours(attendance.undertimeMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Overtime Hours (punched)</div>
          <div className="text-lg font-bold" style={{ color: attendance.overtimeMinutes > 0 ? '#15803d' : MAROON }}>{formatDecimalHours(attendance.overtimeMinutes)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Missing Login</div>
          <div className="text-lg font-bold" style={{ color: attendance.missingLoginDays > 0 ? '#b91c1c' : MAROON }}>{attendance.missingLoginDays} day{attendance.missingLoginDays === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Missing Logout</div>
          <div className="text-lg font-bold" style={{ color: attendance.missingLogoutDays > 0 ? '#b91c1c' : MAROON }}>{attendance.missingLogoutDays} day{attendance.missingLogoutDays === 1 ? '' : 's'}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4 -mt-2">
        Undertime hours here are derived from early logouts only — separate from any approved undertime request on file.
        Overtime hours here are derived from extra punches after the day&apos;s Login–Logout is already complete — separate from any filed Overtime request.
        Absent Days assumes Sunday off and every other day worked, excluding company holidays and filed Leave dates — today and future dates are never counted. A day punched for only the morning or only the afternoon counts as 0.5.
      </p>

      {isAdmin && userEmail && <AttendanceAddPunchButton userEmail={userEmail} />}

      {attendance.dayGroups.length === 0 ? (
        <p className="text-sm text-gray-400">No punches recorded yet this pay period.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {attendance.dayGroups.map(day => {
            const missing = PUNCH_SEQUENCE.filter(step => !day.steps[step])
            return (
              <div key={day.dateKey} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-gray-700">{day.dateKey}</p>
                  {missing.length > 0 && (
                    <p className="text-xs font-medium text-red-700">Missing {missing.map(s => PUNCH_LABELS[s]).join(', ')}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PUNCH_SEQUENCE.map(step => {
                    const row = day.steps[step]
                    const evaluation = day.evaluations[step]
                    return (
                      <div key={step} className="border border-gray-100 rounded-lg p-2">
                        <p className="text-xs text-gray-500">{PUNCH_LABELS[step]}</p>
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
                            {row.place_name && <p className="text-xs text-gray-400">{row.place_name}</p>}
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
                            {row.edited_by && <p className="text-xs text-gray-400">Edited by {row.edited_by}</p>}
                            {isAdmin && <AttendancePunchRowActions id={row.id} punchType={step} createdAtIso={row.created_at} />}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-300">Missed</p>
                            {isAdmin && userEmail && (
                              <AttendancePunchAddAction userEmail={userEmail} punchType={step} dateKey={day.dateKey} />
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                {day.extraPunches.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-green-700 mb-1">
                      Extra punches after this day&apos;s Login–Logout{day.overtimeMinutes > 0 && ` — ${formatDecimalHours(day.overtimeMinutes)} counted as Overtime`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {day.extraPunches.map((row, i) => (
                        <div key={row.id} className="border border-green-100 bg-green-50/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                          <span className="text-gray-500">{i % 2 === 0 ? 'In' : 'Out'}</span>
                          <span className="font-medium">
                            {new Date(row.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </span>
                          {isAdmin && <AttendancePunchRowActions id={row.id} punchType={row.punch_type as PunchType} createdAtIso={row.created_at} />}
                        </div>
                      ))}
                      {day.extraPunches.length % 2 === 1 && (
                        <span className="text-xs text-gray-400 self-center">last one has no closing punch yet — not counted</span>
                      )}
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
