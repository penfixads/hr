import { fifteenPointBand } from '@/lib/fifteenPoint'
import { formatOfficeDate, type PayPeriod } from '@/lib/payday'
import { computeMissingDays, expandLeaveDateKeys, type PayPeriodAttendanceSummary } from '@/lib/attendance'
import { getOfficeDateKey } from '@/lib/office-time'
import type { EmployeeRecords } from '@/lib/employee-records'
import type { LeaveBalance } from '@/lib/leave'
import RequestApprovalActions from '@/components/RequestApprovalActions'
import AttendancePunchCard from '@/components/AttendancePunchCard'
import { titleCase } from '@/lib/text'

const MAROON = '#D9BB6E'

type Props = {
  mode: 'self' | 'admin'
  // email is optional since the self-service caller (app/my-records/page.tsx) doesn't need
  // it — AttendancePunchCard's "Add missing punch" control only renders when mode="admin".
  employee: { full_name: string; employment_status: string | null; email?: string }
  records: EmployeeRecords
  leaveBalances: Record<'Sick Leave' | 'Vacation Leave', LeaveBalance>
  payPeriod: PayPeriod
  nextPayday: Date
  attendance: PayPeriodAttendanceSummary
  absentDays: number
}

// Icons from public/images/myhricons — matched by prefix/substring since callers pass a
// dynamic title (e.g. "Attendance — Aug 14–28, 2026"), not always the exact card name.
// Only covers the titles that actually have uploaded artwork; the rest (Attendance, Loans)
// fall back to no icon.
function cardIcon(title: string): string | null {
  if (title.startsWith('Leave')) return '/images/myhricons/leave.png'
  if (title.startsWith('Cash Advances')) return '/images/myhricons/cash%20advance.png'
  if (title.startsWith('Overtime')) return '/images/myhricons/overtime.png'
  if (title.startsWith('Undertime')) return '/images/myhricons/undertime.png'
  if (title.includes('Quarterly Evaluation')) return '/images/myhricons/quarterly%20eval.png'
  return null
}

// Exported alongside the component so other admin views (components/RequestsOverviewClient.tsx)
// render these request tables with identical formatting/colors instead of a second copy.
export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const icon = cardIcon(title)
  return (
    <div className="bg-penfix-card rounded-xl border shadow-sm p-6 mb-6">
      <h3 className="font-bold text-base mb-4 pb-2 border-b flex items-center gap-2 text-foreground">
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="w-6 h-6 object-contain" />
        )}
        {title}
      </h3>
      {children}
    </div>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-penfix-text-muted">{children}</p>
}

export function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtSubmitted(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusColor(status: string) {
  if (status === 'Approved') return '#16a34a'
  if (status === 'Rejected') return '#dc2626'
  return '#ca8a04'
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor(status), backgroundColor: `${statusColor(status)}1a` }}>
      {status}
    </span>
  )
}

export default function EmployeeRecordSummary({ mode, employee, records, leaveBalances, payPeriod, nextPayday, attendance, absentDays }: Props) {
  const possessive = mode === 'self' ? 'Your' : `${titleCase(employee.full_name)}'s`

  // ot_date is a plain 'YYYY-MM-DD' the employee typed into the Overtime form — same
  // format as a DayGroup's dateKey, so a direct Set lookup is enough, no date-shifting.
  const filedOtDateKeys = new Set(records.overtimes.map(o => o.ot_date))

  // Admin-only, same as the punch Edit/Delete/Add controls: zero-punch days rendered as
  // explicit "Absent" placeholder rows instead of silently having no row at all. Left
  // undefined for mode="self" — AttendancePunchCard already treats undefined as "the caller
  // didn't compute this," matching filedOtDateKeys' convention.
  const missingDays = mode === 'admin'
    ? computeMissingDays(payPeriod.start, payPeriod.end, attendance.dayGroups, expandLeaveDateKeys(records.leaves), getOfficeDateKey(new Date()))
    : undefined

  return (
    <>
      {/* Attendance */}
      <Card title={`Attendance — ${payPeriod.label}`}>
        <AttendancePunchCard
          attendance={attendance}
          absentDays={absentDays}
          leadingStat={{ label: 'Upcoming Payday', value: formatOfficeDate(nextPayday) }}
          isAdmin={mode === 'admin'}
          userEmail={employee.email}
          filedOtDateKeys={filedOtDateKeys}
          missingDays={missingDays}
        />
      </Card>

      {/* Leave */}
      <Card title="Leave">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {(['Vacation Leave', 'Sick Leave'] as const).map(type => {
            const b = leaveBalances[type]
            return (
              <div key={type} className="border border-penfix-border rounded-lg p-3">
                <p className="text-sm font-semibold mb-2" style={{ color: MAROON }}>{type}</p>
                <div className="flex gap-4 text-sm">
                  <span>Accrued: <b>{b.accrued.toFixed(2)}</b></span>
                  <span>Used: <b>{b.used}</b></span>
                  <span style={{ color: b.remaining < 0 ? '#F87171' : undefined }}>Remaining: <b>{b.remaining.toFixed(2)}</b></span>
                </div>
              </div>
            )
          })}
        </div>
        {records.leaves.length === 0 ? <EmptyRow>No leave requests filed yet.</EmptyRow> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-penfix-text-muted border-b">
                <th className="text-left py-2 pr-4 font-medium">Type</th>
                <th className="text-left py-2 px-3 font-medium">Dates</th>
                <th className="text-center py-2 px-3 font-medium">Days</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.leaves.map(l => (
                <tr key={l.id} className="border-b border-penfix-border">
                  <td className="py-2 pr-4 font-medium">{l.leave_type}{l.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
                  <td className="py-2 px-3">{fmtDate(l.start_date)} – {fmtDate(l.end_date)}</td>
                  <td className="py-2 px-3 text-center">{l.days_requested}</td>
                  <td className="py-2 px-3 text-penfix-text-muted">{l.reason || '—'}</td>
                  <td className="py-2 pl-3 text-right text-penfix-text-muted text-xs">{fmtSubmitted(l.submitted_at)}</td>
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
              <tr className="text-xs text-penfix-text-muted border-b">
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
                <tr key={l.id} className="border-b border-penfix-border">
                  <td className="py-2 pr-4">{fmtDate(l.request_date)}</td>
                  <td className="py-2 px-3 text-right font-medium">₱{l.amount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">₱{l.payment_per_payday.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center"><StatusBadge status={l.status} /></td>
                  <td className="py-2 px-3 text-penfix-text-muted">{l.reason || '—'}</td>
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
              <tr className="text-xs text-penfix-text-muted border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-right py-2 px-3 font-medium">Amount</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                {mode === 'admin' && <th className="text-right py-2 pl-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.cashAdvances.map(c => (
                <tr key={c.id} className="border-b border-penfix-border">
                  <td className="py-2 pr-4">{fmtDate(c.request_date)}</td>
                  <td className="py-2 px-3 text-right font-medium">₱{c.amount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="py-2 px-3 text-penfix-text-muted">{c.reason || '—'}</td>
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
              <tr className="text-xs text-penfix-text-muted border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-left py-2 px-3 font-medium">Time</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.overtimes.map(o => (
                <tr key={o.id} className="border-b border-penfix-border">
                  <td className="py-2 pr-4 font-medium">{fmtDate(o.ot_date)}{o.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
                  <td className="py-2 px-3">{o.start_time} – {o.end_time}</td>
                  <td className="py-2 px-3 text-penfix-text-muted">{o.reason}</td>
                  <td className="py-2 pl-3 text-right text-penfix-text-muted text-xs">{fmtSubmitted(o.submitted_at)}</td>
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
              <tr className="text-xs text-penfix-text-muted border-b">
                <th className="text-left py-2 pr-4 font-medium">Date</th>
                <th className="text-left py-2 px-3 font-medium">Time In / Out</th>
                <th className="text-left py-2 px-3 font-medium">Reason</th>
                <th className="text-right py-2 pl-3 font-medium">Filed</th>
              </tr>
            </thead>
            <tbody>
              {records.undertimes.map(u => (
                <tr key={u.id} className="border-b border-penfix-border">
                  <td className="py-2 pr-4 font-medium">{fmtDate(u.undertime_date)}</td>
                  <td className="py-2 px-3">{u.time_in || '—'} / {u.time_out || '—'}</td>
                  <td className="py-2 px-3 text-penfix-text-muted">{u.reason}</td>
                  <td className="py-2 pl-3 text-right text-penfix-text-muted text-xs">{fmtSubmitted(u.submitted_at)}</td>
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
              <tr className="text-xs text-penfix-text-muted border-b">
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
                  <tr key={ev.id} className="border-b border-penfix-border">
                    <td className="py-2 pr-4 font-medium">{ev.quarter} {ev.year}</td>
                    <td className="py-2 px-3 text-center">{ev.total} / 150</td>
                    <td className="py-2 px-3 text-center">{ev.percentage.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: band.color }}>{band.label}</td>
                    <td className="py-2 pl-3 text-right text-penfix-text-muted text-xs">{fmtSubmitted(ev.submitted_at)}</td>
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
