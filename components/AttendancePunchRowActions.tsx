'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toOfficeLocal, officeLocalToUTC } from '@/lib/office-time'
import { PUNCH_SEQUENCE, PUNCH_LABELS, type PunchType } from '@/lib/attendance-shared'

const MAROON = '#4A0000'

type Props = {
  id: string
  punchType: PunchType
  createdAtIso: string
}

// Splits an ISO instant into the {date, time} strings a plain <input type="date">/<input
// type="time"> pair need, in office-local wall-clock terms (not the admin's own browser
// timezone) — matches how every other punch time on this card is already displayed.
function toOfficeLocalParts(iso: string) {
  const local = toOfficeLocal(new Date(iso))
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  }
}

export default function AttendancePunchRowActions({ id, punchType, createdAtIso }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const initial = toOfficeLocalParts(createdAtIso)
  const [step, setStep] = useState<PunchType>(punchType)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)

  async function save() {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    if (!y || !m || !d || isNaN(h) || isNaN(min)) { setError('Invalid date/time.'); return }
    const createdAt = officeLocalToUTC(y, m - 1, d, h, min)

    setSubmitting(true)
    setError('')
    const res = await fetch('/api/attendance-log', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, punch_type: step, created_at: createdAt.toISOString() }),
    })
    setSubmitting(false)
    if (res.ok) { setEditing(false); router.refresh() }
    else setError('Failed to save — make sure you are logged in as Admin.')
  }

  async function remove() {
    if (!confirm('Delete this punch? This cannot be undone.')) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/attendance-log', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSubmitting(false)
    if (res.ok) router.refresh()
    else setError('Failed to delete — make sure you are logged in as Admin.')
  }

  if (editing) {
    return (
      <div className="mt-1 flex flex-col gap-1">
        <select value={step} onChange={e => setStep(e.target.value as PunchType)}
          className="border border-penfix-border rounded px-1 py-0.5 text-xs">
          {PUNCH_SEQUENCE.map(s => <option key={s} value={s}>{PUNCH_LABELS[s]}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-penfix-border rounded px-1 py-0.5 text-xs" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="border border-penfix-border rounded px-1 py-0.5 text-xs" />
        <div className="flex gap-1">
          <button onClick={save} disabled={submitting}
            className="text-xs font-semibold px-2 py-0.5 rounded text-white disabled:opacity-60" style={{ backgroundColor: MAROON }}>
            Save
          </button>
          <button onClick={() => setEditing(false)} disabled={submitting}
            className="text-xs font-semibold px-2 py-0.5 rounded border border-penfix-border text-penfix-text-muted">
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="mt-1 flex gap-1 items-center">
      <button onClick={() => setEditing(true)} title="Edit punch" disabled={submitting}
        className="p-1 rounded text-white transition hover:opacity-80 disabled:opacity-60" style={{ backgroundColor: MAROON }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
      </button>
      <button onClick={remove} title="Delete punch" disabled={submitting}
        className="p-1 rounded text-white transition hover:opacity-80 disabled:opacity-60" style={{ backgroundColor: MAROON }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
