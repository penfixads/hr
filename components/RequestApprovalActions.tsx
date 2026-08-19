'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RequestType = 'cash_advance' | 'loan'

type Props = {
  requestId: string
  requestType: RequestType
  status: string
}

export default function RequestApprovalActions({ requestId, requestType, status }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [error, setError] = useState('')

  if (status !== 'Pending') return null

  async function decide(decision: 'Approved' | 'Rejected', note?: string) {
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/request-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_type: requestType, request_id: requestId, decision, reject_note: note }),
    })
    setSubmitting(false)
    if (res.ok) router.refresh()
    else setError('Failed — make sure you are logged in as Admin.')
  }

  if (rejecting) {
    // A reason is required for a disapproval (server enforces this too — see
    // app/api/request-approval/route.ts) so there's always a record of why, since this
    // directly denies someone's cash advance/loan.
    const trimmedNote = rejectNote.trim()
    const showRequired = attemptedSubmit && !trimmedNote
    return (
      <div className="flex flex-col gap-1 items-end">
        <input
          className={`border rounded px-2 py-1 text-xs w-40 ${showRequired ? 'border-red-400' : 'border-penfix-border'}`}
          placeholder="Reason (required)"
          value={rejectNote}
          onChange={e => { setRejectNote(e.target.value); if (attemptedSubmit) setAttemptedSubmit(false) }}
        />
        {showRequired && <span className="text-xs text-red-600">A reason is required to disapprove.</span>}
        <div className="flex gap-1">
          <button
            onClick={() => { if (!trimmedNote) { setAttemptedSubmit(true); return } decide('Rejected', trimmedNote) }}
            disabled={submitting}
            className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#dc2626' }}>
            Confirm
          </button>
          <button onClick={() => { setRejecting(false); setAttemptedSubmit(false); setRejectNote('') }} disabled={submitting}
            className="text-xs font-semibold px-2 py-1 rounded border border-penfix-border text-penfix-text-muted">
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex gap-1 items-center justify-end">
      <button onClick={() => decide('Approved')} disabled={submitting}
        className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#16a34a' }}>
        Approve
      </button>
      <button onClick={() => setRejecting(true)} disabled={submitting}
        className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#dc2626' }}>
        Disapprove
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  )
}
