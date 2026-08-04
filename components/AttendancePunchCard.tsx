import { PUNCH_SEQUENCE, PUNCH_LABELS, type PayPeriodAttendanceSummary } from '@/lib/attendance-shared'

const MAROON = '#4A0000'

type Props = {
  attendance: PayPeriodAttendanceSummary
  leadingStat?: { label: string; value: React.ReactNode }
}

export default function AttendancePunchCard({ attendance, leadingStat }: Props) {
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
          <div className="text-xs text-gray-500">Late/Flagged Punches</div>
          <div className="text-lg font-bold" style={{ color: attendance.lateCount > 0 ? '#b91c1c' : MAROON }}>{attendance.lateCount}</div>
        </div>
      </div>

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
                    return (
                      <div key={step} className="border border-gray-100 rounded-lg p-2">
                        <p className="text-xs text-gray-500">{PUNCH_LABELS[step]}</p>
                        {row ? (
                          <>
                            <p className="text-sm font-medium">
                              {new Date(row.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {row.is_flagged && <p className="text-xs text-amber-600">⚠ {row.flag_reason}</p>}
                          </>
                        ) : <p className="text-sm text-gray-300">Missed</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
