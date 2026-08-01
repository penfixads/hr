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
    return (
      <div className="flex flex-col gap-1 items-end">
        <input
          className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
          placeholder="Reason (optional)"
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
        />
        <div className="flex gap-1">
          <button onClick={() => decide('Rejected', rejectNote)} disabled={submitting}
            className="text-xs font-semibold px-2 py-1 rounded text-white disabled:opacity-60" style={{ backgroundColor: '#dc2626' }}>
            Confirm
          </button>
          <button onClick={() => setRejecting(false)} disabled={submitting}
            className="text-xs font-semibold px-2 py-1 rounded border border-gray-300 text-gray-600">
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
        Reject
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  )
}
