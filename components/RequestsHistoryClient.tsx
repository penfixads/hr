'use client'

import { useMemo, useState } from 'react'
import type { RequestsHistory } from '@/lib/employee-records'
import { EmptyRow, StatusBadge, fmtDate, fmtSubmitted } from '@/components/EmployeeRecordSummary'

const MAROON = '#4A0000'

type RequestType = 'cashAdvances' | 'loans' | 'overtimes' | 'undertimes' | 'leaves'

const TABS: { key: RequestType; label: string }[] = [
  { key: 'cashAdvances', label: 'Cash Advances' },
  { key: 'loans', label: 'Loans' },
  { key: 'overtimes', label: 'Overtime' },
  { key: 'undertimes', label: 'Undertime' },
  { key: 'leaves', label: 'Leave' },
]

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected'

function fmtTime(t: string) {
  return t.slice(0, 5)
}

export default function RequestsHistoryClient({ history }: { history: RequestsHistory }) {
  const [tab, setTab] = useState<RequestType>('cashAdvances')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')

  // Only Cash Advance / Loan carry a status — switching to a type without one falls back
  // to "All" so a stale "Approved" filter doesn't silently hide every Overtime/Leave row.
  const hasStatus = tab === 'cashAdvances' || tab === 'loans'

  const rows = history[tab]
  const filtered = useMemo(() => {
    return (rows as { employeeName: string; status?: string }[]).filter(r => {
      if (search && !r.employeeName.toLowerCase().includes(search.toLowerCase())) return false
      if (hasStatus && statusFilter !== 'All' && r.status !== statusFilter) return false
      return true
    })
  }, [rows, search, statusFilter, hasStatus])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter('All') }}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={tab === t.key
              ? { backgroundColor: MAROON, color: 'white' }
              : { backgroundColor: 'white', color: MAROON, border: `1px solid ${MAROON}` }}
          >
            {t.label} <span className="opacity-70">({history[t.key].length})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
        {hasStatus && (
          <div className="flex gap-1">
            {(['All', 'Pending', 'Approved', 'Rejected'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={statusFilter === s
                  ? { backgroundColor: MAROON, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        {filtered.length === 0 ? (
          <EmptyRow>No {TABS.find(t => t.key === tab)!.label.toLowerCase()} match this filter.</EmptyRow>
        ) : tab === 'cashAdvances' ? (
          <CashAdvanceHistoryTable rows={filtered as RequestsHistory['cashAdvances']} />
        ) : tab === 'loans' ? (
          <LoanHistoryTable rows={filtered as RequestsHistory['loans']} />
        ) : tab === 'overtimes' ? (
          <OvertimeHistoryTable rows={filtered as RequestsHistory['overtimes']} />
        ) : tab === 'undertimes' ? (
          <UndertimeHistoryTable rows={filtered as RequestsHistory['undertimes']} />
        ) : (
          <LeaveHistoryTable rows={filtered as RequestsHistory['leaves']} />
        )}
      </div>
    </div>
  )
}

function CashAdvanceHistoryTable({ rows }: { rows: RequestsHistory['cashAdvances'] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Employee</th>
          <th className="text-left py-2 px-3 font-medium">Date</th>
          <th className="text-right py-2 px-3 font-medium">Amount</th>
          <th className="text-center py-2 px-3 font-medium">Status</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-left py-2 pl-3 font-medium">Resolved</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium" style={{ color: MAROON }}>{r.employeeName}</td>
            <td className="py-2 px-3">{fmtDate(r.request_date)}</td>
            <td className="py-2 px-3 text-right font-medium">₱{r.amount.toLocaleString()}</td>
            <td className="py-2 px-3 text-center"><StatusBadge status={r.status} /></td>
            <td className="py-2 px-3 text-gray-600">{r.reason || '—'}</td>
            <td className="py-2 pl-3 text-gray-500 text-xs">
              {r.resolved_at ? `${fmtSubmitted(r.resolved_at)}${r.approved_by ? ` by ${r.approved_by}` : ''}` : '—'}
              {r.reject_note && <div className="text-red-500">{r.reject_note}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LoanHistoryTable({ rows }: { rows: RequestsHistory['loans'] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Employee</th>
          <th className="text-left py-2 px-3 font-medium">Date</th>
          <th className="text-right py-2 px-3 font-medium">Amount</th>
          <th className="text-right py-2 px-3 font-medium">Per Payday</th>
          <th className="text-center py-2 px-3 font-medium">Status</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-left py-2 pl-3 font-medium">Resolved</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium" style={{ color: MAROON }}>{r.employeeName}</td>
            <td className="py-2 px-3">{fmtDate(r.request_date)}</td>
            <td className="py-2 px-3 text-right font-medium">₱{r.amount.toLocaleString()}</td>
            <td className="py-2 px-3 text-right">₱{r.payment_per_payday.toLocaleString()}</td>
            <td className="py-2 px-3 text-center"><StatusBadge status={r.status} /></td>
            <td className="py-2 px-3 text-gray-600">{r.reason || '—'}</td>
            <td className="py-2 pl-3 text-gray-500 text-xs">
              {r.resolved_at ? `${fmtSubmitted(r.resolved_at)}${r.approved_by ? ` by ${r.approved_by}` : ''}` : '—'}
              {r.reject_note && <div className="text-red-500">{r.reject_note}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OvertimeHistoryTable({ rows }: { rows: RequestsHistory['overtimes'] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Employee</th>
          <th className="text-left py-2 px-3 font-medium">Date</th>
          <th className="text-left py-2 px-3 font-medium">Time</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-right py-2 pl-3 font-medium">Filed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium" style={{ color: MAROON }}>{r.employeeName}</td>
            <td className="py-2 px-3">{fmtDate(r.ot_date)}{r.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
            <td className="py-2 px-3">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</td>
            <td className="py-2 px-3 text-gray-600">{r.reason}</td>
            <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(r.submitted_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UndertimeHistoryTable({ rows }: { rows: RequestsHistory['undertimes'] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Employee</th>
          <th className="text-left py-2 px-3 font-medium">Date</th>
          <th className="text-left py-2 px-3 font-medium">Time In</th>
          <th className="text-left py-2 px-3 font-medium">Time Out</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-right py-2 pl-3 font-medium">Filed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium" style={{ color: MAROON }}>{r.employeeName}</td>
            <td className="py-2 px-3">{fmtDate(r.undertime_date)}</td>
            <td className="py-2 px-3">{r.time_in ? fmtTime(r.time_in) : '—'}</td>
            <td className="py-2 px-3">{r.time_out ? fmtTime(r.time_out) : '—'}</td>
            <td className="py-2 px-3 text-gray-600">{r.reason}</td>
            <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(r.submitted_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LeaveHistoryTable({ rows }: { rows: RequestsHistory['leaves'] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Employee</th>
          <th className="text-left py-2 px-3 font-medium">Type</th>
          <th className="text-left py-2 px-3 font-medium">Dates</th>
          <th className="text-center py-2 px-3 font-medium">Days</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-right py-2 pl-3 font-medium">Filed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium" style={{ color: MAROON }}>{r.employeeName}</td>
            <td className="py-2 px-3">{r.leave_type}{r.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
            <td className="py-2 px-3">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</td>
            <td className="py-2 px-3 text-center">{r.days_requested}</td>
            <td className="py-2 px-3 text-gray-600">{r.reason || '—'}</td>
            <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(r.submitted_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
