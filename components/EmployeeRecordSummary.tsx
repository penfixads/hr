import { fifteenPointBand } from '@/lib/fifteenPoint'
import { formatOfficeDate, type PayPeriod } from '@/lib/payday'
import type { PayPeriodAttendanceSummary } from '@/lib/attendance'
import type { EmployeeRecords } from '@/lib/employee-records'
import type { LeaveBalance } from '@/lib/leave'
import RequestApprovalActions from '@/components/RequestApprovalActions'
import AttendancePunchCard from '@/components/AttendancePunchCard'

const MAROON = '#4A0000'

type Props = {
  mode: 'self' | 'admin'
  employee: { full_name: string; employment_status: string | null }
  records: EmployeeRecords
  leaveBalances: Record<'Sick Leave' | 'Vacation Leave', LeaveBalance>
  payPeriod: PayPeriod
  nextPayday: Date
  attendance: PayPeriodAttendanceSummary
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
      <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: MAROON }}>{title}</h3>
      {children}
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtSubmitted(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusColor(status: string) {
  if (status === 'Approved') return '#16a34a'
  if (status === 'Rejected') return '#dc2626'
  return '#ca8a04'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor(status), backgroundColor: `${statusColor(status)}1a` }}>
      {status}
    </span>
  )
}

export default function EmployeeRecordSummary({ mode, employee, records, leaveBalances, payPeriod, nextPayday, attendance }: Props) {
  const possessive = mode === 'self' ? 'Your' : `${employee.full_name}'s`

  return (
    <>
      {/* Attendance */}
      <Card title={`Attendance — ${payPeriod.label}`}>
        <AttendancePunchCard
          attendance={attendance}
          leadingStat={{ label: 'Upcoming Payday', value: formatOfficeDate(nextPayday) }}
        />
      </Card>

      {/* Leave */}
      <Card title="Leave">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {(['Vacation Leave', 'Sick Leave'] as const).map(type => {
            const b = leaveBalances[type]
            return (
              <div key={type} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-semibold mb-2" style={{ color: MAROON }}>{type}</p>
                <div className="flex gap-4 text-sm">
                  <span>Accrued: <b>{b.accrued.toFixed(2)}</b></span>
                  <span>Used: <b>{b.used}</b></span>
                  <span style={{ color: b.remaining < 0 ? '#b91c1c' : undefined }}>Remaining: <b>{b.remaining.toFixed(2)}</b></span>
                </div>
              </div>
            )
          })}
        </div>
        {records.leaves.length === 0 ? <EmptyRow>No leave requests filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Type</th>
                <th className="text-left py-2 px-3 font-medium">Dates</th>
                <th className="text-center py-2 px-3 font-medium">Days</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.leaves.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium">{l.leave_type}{l.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
                  <td className="py-2 px-3">{fmtDate(l.start_date)} – {fmtDate(l.end_date)}</td>
                  <td className="py-2 px-3 text-center">{l.days_requested}</td>
                  <td className="py-2 px-3 text-gray-600">{l.reason || '—'}</td>
                  <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(l.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Loans */}
      <Card title="Loans">
        {records.loans.length === 0 ? <EmptyRow>{possessive} no loan requests filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-right py-2 px-3 font-medium">Amount</th>
                <th className="text-right py-2 px-3 font-medium">Per Payday</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                {mode === 'admin' && <th className="text-right py-2 pl-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.loans.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4">{fmtDate(l.request_date)}</td>
                  <td className="py-2 px-3 text-right font-medium">₱{l.amount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">₱{l.payment_per_payday.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center"><StatusBadge status={l.status} /></td>
                  <td className="py-2 px-3 text-gray-600">{l.reason || '—'}</td>
                  {mode === 'admin' && (
                    <td className="py-2 pl-3">
                      <RequestApprovalActions requestId={l.id} requestType="loan" status={l.status} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Cash Advances */}
      <Card title="Cash Advances">
        {records.cashAdvances.length === 0 ? <EmptyRow>{possessive} no cash advance requests filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-right py-2 px-3 font-medium">Amount</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                {mode === 'admin' && <th className="text-right py-2 pl-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.cashAdvances.map(c => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4">{fmtDate(c.request_date)}</td>
                  <td className="py-2 px-3 text-right font-medium">₱{c.amount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="py-2 px-3 text-gray-600">{c.reason || '—'}</td>
                  {mode === 'admin' && (
                    <td className="py-2 pl-3">
                      <RequestApprovalActions requestId={c.id} requestType="cash_advance" status={c.status} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Overtime */}
      <Card title="Overtime">
        {records.overtimes.length === 0 ? <EmptyRow>{possessive} no overtime filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-left py-2 px-3 font-medium">Time</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.overtimes.map(o => (
                <tr key={o.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium">{fmtDate(o.ot_date)}{o.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
                  <td className="py-2 px-3">{o.start_time} – {o.end_time}</td>
                  <td className="py-2 px-3 text-gray-600">{o.reason}</td>
                  <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(o.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Undertime */}
      <Card title="Undertime">
        {records.undertimes.length === 0 ? <EmptyRow>{possessive} no undertime filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-left py-2 px-3 font-medium">Time In / Out</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.undertimes.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium">{fmtDate(u.undertime_date)}</td>
                  <td className="py-2 px-3">{u.time_in || '—'} / {u.time_out || '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{u.reason}</td>
                  <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(u.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Evaluations */}
      <Card title="15-Point Quarterly Evaluation History">
        {records.evaluations.length === 0 ? <EmptyRow>No quarterly self-evaluations submitted yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 pr-4 font-medium">Quarter</th>
                <th className="text-center py-2 px-3 font-medium">Total</th>
                <th className="text-center py-2 px-3 font-medium">Percentage</th>
                <th className="text-center py-2 px-3 font-medium">Rating</th>
                <th className="text-right py-2 pl-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {records.evaluations.map(ev => {
                const band = fifteenPointBand(ev.percentage)
                return (
                  <tr key={ev.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium">{ev.quarter} {ev.year}</td>
                    <td className="py-2 px-3 text-center">{ev.total} / 150</td>
                    <td className="py-2 px-3 text-center">{ev.percentage.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: band.color }}>{band.label}</td>
                    <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(ev.submitted_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
