'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { daysInclusive } from '@/lib/leave'
import type { LeaveRow } from '@/lib/employee-records'

// One row of the Leave table in MyHR, with the employee's own "fix what I filed" control
// (app/api/leave-edit/route.ts). Split out of EmployeeRecordSummary.tsx, which is a server
// component, and rendered only for mode="self" — the admin view of the same table stays
// read-only, as it was.
//
// This exists because a one-day leave filed as a two-day range ("Aug 31 - Sep 1" meaning
// Aug 31 only) silently costs a second credit, and until now only HR could undo that.
const inputClass = "border border-penfix-border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-penfix-gold"

const LEAVE_TYPES = ['Sick Leave', 'Vacation Leave'] as const

// The display labels are formatted by the caller and passed in, rather than importing
// EmployeeRecordSummary's fmtDate/fmtSubmitted here: that file imports this one, so
// reaching back into it would make the two modules circular.
type Props = {
  leave: LeaveRow
  datesLabel: string
  filedLabel: string
  editedLabel: string | null
}

export default function LeaveRowEditor({ leave, datesLabel, filedLabel, editedLabel }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [leaveType, setLeaveType] = useState(leave.leave_type)
  const [startDate, setStartDate] = useState(leave.start_date)
  const [endDate, setEndDate] = useState(leave.end_date)
  const [reason, setReason] = useState(leave.reason ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const validRange = !!startDate && !!endDate && endDate >= startDate
  const newDays = validRange ? daysInclusive(startDate, endDate) : 0

  function cancel() {
    setLeaveType(leave.leave_type)
    setStartDate(leave.start_date)
    setEndDate(leave.end_date)
    setReason(leave.reason ?? '')
    setError('')
    setEditing(false)
  }

  async function save() {
    if (!validRange) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/leave-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: leave.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
      return
    }
    const body = await res.json().catch(() => ({}))
    setError(body.error || 'Save failed. Please try again.')
  }

  if (!editing) {
    return (
      <tr className="border-b border-penfix-border">
        <td className="py-2 pr-4 font-medium">
          {leave.leave_type}
          {leave.filed_late && <span className="text-amber-600 text-xs ml-1">(late)</span>}
        </td>
        <td className="py-2 px-3">{datesLabel}</td>
        <td className="py-2 px-3 text-center">{leave.days_requested}</td>
        <td className="py-2 px-3 text-penfix-text-muted">{leave.reason || '—'}</td>
        <td className="py-2 px-3 text-right text-penfix-text-muted text-xs">
          {filedLabel}
          {editedLabel && <span className="block">(edited {editedLabel})</span>}
        </td>
        <td className="py-2 pl-3 text-right">
          <button onClick={() => setEditing(true)} title="Correct this filing"
            className="text-xs font-semibold px-2 py-1 rounded border border-penfix-border text-penfix-text-muted hover:bg-penfix-surface-muted">
            ✎ Edit
          </button>
        </td>
      </tr>
    )
  }

  // Gold-tinted dark surface, NOT the bg-amber-50/40 the overtime editor uses
  // (components/RequestsOverviewClient.tsx). That class is a light-theme highlight; over
  // this app's maroon card (#4A0000) it composites to a muddy mid-tone that drops the
  // hint text below to 2.66:1 — under WCAG AA, on the one sentence that explains the
  // single-day fix. This tint keeps it at 7.2:1.
  return (
    <tr className="border-b border-penfix-border" style={{ backgroundColor: 'rgba(201, 168, 76, 0.10)' }}>
      <td className="py-2 pr-4 align-top">
        <select className={inputClass} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
          {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="py-2 px-3 align-top">
        <div className="flex items-center gap-1">
          <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-penfix-text-muted">–</span>
          <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {/* Same date in both boxes is a one-day leave — spelling that out is the whole
            point of this editor, since filing "Aug 31 - Sep 1" for one day is the mistake
            it was built to fix. */}
        <p className="text-xs text-penfix-text-muted mt-1">
          {validRange
            ? `${newDays} day${newDays !== 1 ? 's' : ''} — for a single day, set both dates to that same day.`
            : 'End of Leave can’t be before Start of Leave.'}
        </p>
      </td>
      <td className="py-2 px-3 align-top text-center">{validRange ? newDays : '—'}</td>
      <td className="py-2 px-3 align-top">
        <input type="text" className={inputClass} value={reason} placeholder="Reason (optional)"
          onChange={e => setReason(e.target.value)} />
      </td>
      <td className="py-2 px-3 align-top text-right text-penfix-text-muted text-xs">
        {filedLabel}
      </td>
      <td className="py-2 pl-3 align-top">
        <div className="flex gap-1 justify-end items-center">
          <button onClick={save} disabled={saving || !validRange}
            className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#16a34a' }}>
            {saving ? 'Saving...' : '✓ Save'}
          </button>
          <button onClick={cancel} disabled={saving}
            className="text-xs font-semibold px-2 py-1 rounded border border-penfix-border text-penfix-text-muted">
            ✕ Cancel
          </button>
        </div>
        {error && <div className="text-xs text-red-400 text-right mt-1">{error}</div>}
      </td>
    </tr>
  )
}
