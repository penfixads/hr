'use client'

import { useState } from 'react'
import type { RequestsOverviewEmployee } from '@/lib/employee-records'
import { Card, EmptyRow, StatusBadge, fmtDate, fmtSubmitted } from '@/components/EmployeeRecordSummary'
import RequestApprovalActions from '@/components/RequestApprovalActions'

const MAROON = '#4A0000'

function LoanTable({ loans }: { loans: RequestsOverviewEmployee['loans'] }) {
  if (loans.length === 0) return <EmptyRow>No loan requests this period.</EmptyRow>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Date</th>
          <th className="text-right py-2 px-3 font-medium">Amount</th>
          <th className="text-right py-2 px-3 font-medium">Per Payday</th>
          <th className="text-center py-2 px-3 font-medium">Status</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-right py-2 pl-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {loans.map(l => (
          <tr key={l.id} className="border-b border-gray-50">
            <td className="py-2 pr-4">{fmtDate(l.request_date)}</td>
            <td className="py-2 px-3 text-right font-medium">₱{l.amount.toLocaleString()}</td>
            <td className="py-2 px-3 text-right">₱{l.payment_per_payday.toLocaleString()}</td>
            <td className="py-2 px-3 text-center"><StatusBadge status={l.status} /></td>
            <td className="py-2 px-3 text-gray-600">{l.reason || '—'}</td>
            <td className="py-2 pl-3"><RequestApprovalActions requestId={l.id} requestType="loan" status={l.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CashAdvanceTable({ cashAdvances }: { cashAdvances: RequestsOverviewEmployee['cashAdvances'] }) {
  if (cashAdvances.length === 0) return <EmptyRow>No cash advance requests this period.</EmptyRow>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b">
          <th className="text-left py-2 pr-4 font-medium">Date</th>
          <th className="text-right py-2 px-3 font-medium">Amount</th>
          <th className="text-center py-2 px-3 font-medium">Status</th>
          <th className="text-left py-2 px-3 font-medium">Reason</th>
          <th className="text-right py-2 pl-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {cashAdvances.map(c => (
          <tr key={c.id} className="border-b border-gray-50">
            <td className="py-2 pr-4">{fmtDate(c.request_date)}</td>
            <td className="py-2 px-3 text-right font-medium">₱{c.amount.toLocaleString()}</td>
            <td className="py-2 px-3 text-center"><StatusBadge status={c.status} /></td>
            <td className="py-2 px-3 text-gray-600">{c.reason || '—'}</td>
            <td className="py-2 pl-3"><RequestApprovalActions requestId={c.id} requestType="cash_advance" status={c.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OvertimeTable({ overtimes }: { overtimes: RequestsOverviewEmployee['overtimes'] }) {
  if (overtimes.length === 0) return <EmptyRow>No overtime filed this period.</EmptyRow>
  return (
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
        {overtimes.map(o => (
          <tr key={o.id} className="border-b border-gray-50">
            <td className="py-2 pr-4 font-medium">{fmtDate(o.ot_date)}{o.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
            <td className="py-2 px-3">{o.start_time} – {o.end_time}</td>
            <td className="py-2 px-3 text-gray-600">{o.reason}</td>
            <td className="py-2 pl-3 text-right text-gray-500 text-xs">{fmtSubmitted(o.submitted_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LeaveTable({ leaves }: { leaves: RequestsOverviewEmployee['leaves'] }) {
  if (leaves.length === 0) return <EmptyRow>No leave filed this period.</EmptyRow>
  return (
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
        {leaves.map(l => (
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
  )
}

function countLabel(n: number, singular: string) {
  return `${n} ${singular}${n === 1 ? '' : 's'}`
}

export default function RequestsOverviewClient({ entries }: { entries: RequestsOverviewEmployee[] }) {
  const [search, setSearch] = useState('')
  const filtered = entries.filter(e => !search || e.employeeName.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <input
        type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
          {entries.length === 0 ? 'No cash advance, loan, overtime, or leave requests this pay period.' : 'No employees found.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(entry => {
            const pendingCount = entry.cashAdvances.filter(c => c.status === 'Pending').length
              + entry.loans.filter(l => l.status === 'Pending').length
            return (
              <details key={entry.employeeId} open className="bg-white rounded-xl border shadow-sm p-6 group">
                <summary className="flex items-center justify-between cursor-pointer list-none mb-4 pb-2 border-b">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-base" style={{ color: MAROON }}>{entry.employeeName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {entry.cashAdvances.length > 0 && <span>{countLabel(entry.cashAdvances.length, 'cash advance')}</span>}
                      {entry.loans.length > 0 && <span>{countLabel(entry.loans.length, 'loan')}</span>}
                      {entry.overtimes.length > 0 && <span>{countLabel(entry.overtimes.length, 'OT filing')}</span>}
                      {entry.leaves.length > 0 && <span>{countLabel(entry.leaves.length, 'leave filing')}</span>}
                    </div>
                    {pendingCount > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#ca8a04', backgroundColor: '#ca8a041a' }}>
                        {countLabel(pendingCount, 'pending approval')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
                </summary>

                {entry.cashAdvances.length > 0 && (
                  <Card title="Cash Advances"><CashAdvanceTable cashAdvances={entry.cashAdvances} /></Card>
                )}
                {entry.loans.length > 0 && (
                  <Card title="Loans"><LoanTable loans={entry.loans} /></Card>
                )}
                {entry.overtimes.length > 0 && (
                  <Card title="Overtime"><OvertimeTable overtimes={entry.overtimes} /></Card>
                )}
                {entry.leaves.length > 0 && (
                  <Card title="Leave"><LeaveTable leaves={entry.leaves} /></Card>
                )}
              </details>
            )
          })}
        </div>
      )}
    </>
  )
}
