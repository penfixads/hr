'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { officeLocalToUTC } from '@/lib/office-time'
import type { PunchType } from '@/lib/attendance-shared'

const MAROON = '#4A0000'

type Props = {
  userEmail: string
  punchType: PunchType
  dateKey: string // 'YYYY-MM-DD' — the day group this missing punch slot belongs to
}

// Lets an Admin fill in a punch step that's showing "Missed" (e.g. an employee forgot to
// log out) — companion to AttendancePunchRowActions.tsx, which only handles
// editing/deleting a punch that already exists. Hits the new POST handler in
// app/api/attendance-log/route.ts, gated by the admin_insert_attendance_logs RLS policy
// (attendance/supabase/migrations/053_admin_insert_attendance.sql).
export default function AttendancePunchAddAction({ userEmail, punchType, dateKey }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [time, setTime] = useState('')

  async function save() {
    if (!time) { setError('Pick a time.'); return }
    const [y, m, d] = dateKey.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    const createdAt = officeLocalToUTC(y, m - 1, d, h, min)

    setSubmitting(true)
    setError('')
    const res = await fetch('/api/attendance-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, punch_type: punchType, created_at: createdAt.toISOString() }),
    })
    setSubmitting(false)
    if (res.ok) { setAdding(false); setTime(''); router.refresh() }
    else setError('Failed to add — make sure you are logged in as Admin.')
  }

  if (adding) {
    return (
      <div className="mt-1 flex flex-col gap-1">
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="border border-penfix-border rounded px-1 py-0.5 text-xs" />
        <div className="flex gap-1">
          <button onClick={save} disabled={submitting}
            className="text-xs font-semibold px-2 py-0.5 rounded text-white disabled:opacity-60" style={{ backgroundColor: MAROON }}>
            Save
          </button>
          <button onClick={() => { setAdding(false); setError('') }} disabled={submitting}
            className="text-xs font-semibold px-2 py-0.5 rounded border border-penfix-border text-penfix-text-muted">
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <button onClick={() => setAdding(true)} title="Add missing punch" disabled={submitting}
      className="mt-1 p-1 rounded text-white transition hover:opacity-80 disabled:opacity-60" style={{ backgroundColor: MAROON }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
