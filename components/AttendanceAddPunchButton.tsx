'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { officeLocalToUTC } from '@/lib/office-time'
import { PUNCH_SEQUENCE, PUNCH_LABELS, type PunchType } from '@/lib/attendance-shared'

const MAROON = '#4A0000'

// Card-level "add a punch for any date" — the companion to AttendancePunchAddAction.tsx,
// which can only fill a "Missed" slot inside a day card that already exists. Day cards are
// built from existing punches (groupLogsByDay), so a day with NO punches at all renders no
// card and therefore no per-slot + button. This control takes its own date input so an
// Admin can backfill such a day (e.g. from the paper backup register kept alongside the
// app during the rollout). Same POST handler and admin_insert_attendance_logs RLS.
export default function AttendanceAddPunchButton({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [step, setStep] = useState<PunchType>('login')

  async function save() {
    if (!date || !time) { setError('Pick a date and time.'); return }
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    const createdAt = officeLocalToUTC(y, m - 1, d, h, min)

    setSubmitting(true)
    setError('')
    const res = await fetch('/api/attendance-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, punch_type: step, created_at: createdAt.toISOString() }),
    })
    setSubmitting(false)
    if (res.ok) {
      // Date is deliberately kept so several punches for the same day can be added in a row.
      setTime('')
      router.refresh()
    } else {
      setError('Failed to add — make sure you are logged in as Admin.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 text-xs font-semibold px-3 py-1.5 rounded text-white transition hover:opacity-80"
        style={{ backgroundColor: MAROON }}
      >
        + Add punch
      </button>
    )
  }

  return (
    <div className="mb-4 border border-penfix-border rounded-lg p-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-penfix-text-muted">Date</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-penfix-border rounded px-2 py-1 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-penfix-text-muted">Punch</span>
        <select value={step} onChange={e => setStep(e.target.value as PunchType)}
          className="border border-penfix-border rounded px-2 py-1 text-sm">
          {PUNCH_SEQUENCE.map(s => <option key={s} value={s}>{PUNCH_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-penfix-text-muted">Time</span>
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="border border-penfix-border rounded px-2 py-1 text-sm" />
      </label>
      <button onClick={save} disabled={submitting}
        className="text-xs font-semibold px-3 py-1.5 rounded text-white disabled:opacity-60" style={{ backgroundColor: MAROON }}>
        {submitting ? 'Saving…' : 'Save'}
      </button>
      <button onClick={() => { setOpen(false); setError('') }} disabled={submitting}
        className="text-xs font-semibold px-3 py-1.5 rounded border border-penfix-border text-penfix-text-muted">
        Close
      </button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </div>
  )
}
