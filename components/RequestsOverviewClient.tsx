'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RequestsOverviewEmployee, OvertimeRow } from '@/lib/employee-records'
import { Card, EmptyRow, StatusBadge, fmtDate, fmtSubmitted } from '@/components/EmployeeRecordSummary'
import RequestApprovalActions from '@/components/RequestApprovalActions'

const inputClass = "border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-penfix-gold"

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

// HH:MM, trimmed from the "HH:MM:SS" the DB returns, so it drops straight into a
// type="time" input without the seconds tripping up its value matching.
function toTimeInputValue(t: string) {
  return t.slice(0, 5)
}

// end_time <= start_time means the shift crossed midnight (e.g. 20:00–02:00 is 6h, not
// negative) — add a day rather than treat it as a data error, since overnight OT is normal
// for late installs.
function overtimeMinutes(o: { start_time: string; end_time: string }): number {
  const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const start = toMinutes(o.start_time)
  let end = toMinutes(o.end_time)
  if (end <= start) end += 24 * 60
  return end - start
}

// Decimal hours (payroll convention), not h/m — 3h36m is 3.6, since 36 minutes is exactly
// 0.6 of an hour.
function formatOvertimeHours(totalMinutes: number): string {
  return `${(totalMinutes / 60).toFixed(1)} hrs`
}

function OvertimeEditRow({ overtime, onDone }: { overtime: OvertimeRow; onDone: () => void }) {
  const router = useRouter()
  const [otDate, setOtDate] = useState(overtime.ot_date)
  const [startTime, setStartTime] = useState(toTimeInputValue(overtime.start_time))
  const [endTime, setEndTime] = useState(toTimeInputValue(overtime.end_time))
  const [reason, setReason] = useState(overtime.reason)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = !!otDate && !!startTime && !!endTime && reason.trim() !== ''

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/overtime-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: overtime.id, ot_date: otDate, start_time: startTime, end_time: endTime, reason: reason.trim() }),
    })
    setSaving(false)
    if (res.ok) { router.refresh(); onDone() }
    else setError('Save failed — make sure you are logged in as Admin.')
  }

  return (
    <tr className="border-b border-gray-50 bg-amber-50/40">
      <td className="py-2 pr-4 align-top"><input type="date" className={inputClass} value={otDate} onChange={e => setOtDate(e.target.value)} /></td>
      <td className="py-2 px-3 align-top">
        <div className="flex items-center gap-1">
          <input type="time" className={inputClass} value={startTime} onChange={e => setStartTime(e.target.value)} />
          <span className="text-gray-400">–</span>
          <input type="time" className={inputClass} value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </td>
      <td className="py-2 px-3 align-top"><input type="text" className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></td>
      <td className="py-2 pl-3 align-top">
        <div className="flex gap-1 justify-end items-center">
          <button onClick={save} disabled={saving || !canSave}
            className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#16a34a' }}>
            {saving ? 'Saving...' : '✓ Save'}
          </button>
          <button onClick={onDone} disabled={saving}
            className="text-xs font-semibold px-2 py-1 rounded border border-gray-300 text-gray-600">
            ✕ Cancel
          </button>
        </div>
        {error && <div className="text-xs text-red-600 text-right mt-1">{error}</div>}
      </td>
    </tr>
  )
}

// Removes an accidental duplicate filing (e.g. the same overtime submitted twice) — no
// undo, so this confirms before calling /api/overtime-edit's DELETE handler.
function DeleteOvertimeButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (!confirm('Delete this overtime filing? This cannot be undone.')) return
    setDeleting(true)
    setError('')
    const res = await fetch('/api/overtime-edit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })
    setDeleting(false)
    if (res.ok) router.refresh()
    else setError('Delete failed — make sure you are logged in as Admin.')
  }

  return (
    <>
      <button onClick={remove} disabled={deleting} title="Delete"
        className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#dc2626' }}>
        🗑
      </button>
      {error && <span className="text-xs text-red-600 ml-1">{error}</span>}
    </>
  )
}

function OvertimeTable({ overtimes }: { overtimes: RequestsOverviewEmployee['overtimes'] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  if (overtimes.length === 0) return <EmptyRow>No overtime filed this period.</EmptyRow>
  const totalMinutes = overtimes.reduce((sum, o) => sum + overtimeMinutes(o), 0)
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
          editingId === o.id ? (
            <OvertimeEditRow key={o.id} overtime={o} onDone={() => setEditingId(null)} />
          ) : (
            <tr key={o.id} className="border-b border-gray-50">
              <td className="py-2 pr-4 font-medium">{fmtDate(o.ot_date)}{o.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}</td>
              <td className="py-2 px-3">{o.start_time} – {o.end_time}</td>
              <td className="py-2 px-3 text-gray-600">{o.reason}</td>
              <td className="py-2 pl-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-500 text-xs">{fmtSubmitted(o.submitted_at)}</span>
                  <button onClick={() => setEditingId(o.id)} title="Edit"
                    className="text-xs font-semibold px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                    ✎ Edit
                  </button>
                  <DeleteOvertimeButton requestId={o.id} />
                </div>
              </td>
            </tr>
          )
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="pt-2 pr-4 text-xs text-gray-500" colSpan={4}>
            Total: <span className="font-semibold" style={{ color: MAROON }}>{formatOvertimeHours(totalMinutes)}</span>
          </td>
        </tr>
      </tfoot>
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
  const totalOvertimeMinutes = filtered.reduce(
    (sum, e) => sum + e.overtimes.reduce((s, o) => s + overtimeMinutes(o), 0), 0
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
        {totalOvertimeMinutes > 0 && (
          <span className="text-sm text-gray-500">
            Total Overtime{search && ' (matching search)'}: <span className="font-semibold" style={{ color: MAROON }}>{formatOvertimeHours(totalOvertimeMinutes)}</span>
          </span>
        )}
      </div>

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
                      {entry.overtimes.length > 0 && (
                        <span>
                          {countLabel(entry.overtimes.length, 'OT filing')}
                          {' '}({formatOvertimeHours(entry.overtimes.reduce((sum, o) => sum + overtimeMinutes(o), 0))})
                        </span>
                      )}
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
