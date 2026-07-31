'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production' }

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Rebuilds the legacy "PENFIX OVERTIME FORM" (Name, Date, Start Time, End Time, and a
// field literally labeled "Question" — renamed here to "Reason for Overtime", it's the
// same reason/justification role "Reason for X" plays on the other forms).
//
// Per GENERAL POLICY.docx: overtime must be filed within 3 days after the date it was
// worked, else it's not paid. We don't block late filing (there may be a valid reason,
// and this app has no approval-override flow yet) — we warn, and store `filed_late` so
// a future admin review screen can see it.
export default function OvertimeForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [otDate, setOtDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('employees').select('id, full_name, team').order('full_name').then(({ data }) => {
      setEmployees((data as EmployeeOption[]) ?? [])
      setLoadingEmployees(false)
    })
  }, [])

  const selected = employees.find(e => e.id === selectedId) || null
  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()))

  const daysSinceOt = otDate ? Math.floor((Date.now() - new Date(otDate + 'T00:00:00').getTime()) / MS_PER_DAY) : 0
  const filedLate = otDate !== '' && daysSinceOt > 3
  const canSubmit = !!selected && !!otDate && !!startTime && !!endTime && reason.trim() !== ''

  function selectEmployee(emp: EmployeeOption) {
    setSelectedId(emp.id)
    setSearch('')
  }

  async function handleSubmit() {
    if (!selected || !canSubmit) return
    setSubmitting(true)
    setError('')
    const payload = {
      employee_id: selected.id,
      employee_name: selected.full_name,
      ot_date: otDate,
      start_time: startTime,
      end_time: endTime,
      reason: reason.trim(),
      filed_late: filedLate,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('overtime_requests').insert([payload])
    setSubmitting(false)
    if (sbErr) {
      setError(sbErr.message || 'Submission failed. Please try again.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#4A0000' }}>Overtime Filed!</h2>
        <p className="text-gray-600 text-lg max-w-md">
          Thank you, {selected?.full_name} — your overtime for {otDate} has been recorded.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h3 className="text-lg font-bold mb-1" style={{ color: '#4A0000' }}>Overtime Form</h3>
      <p className="text-sm text-gray-500 mb-6">
        Must be filed within 3 days after the overtime was worked, and requires prior notice to your
        supervisor, per company policy.
      </p>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <label className={labelClass}>Name</label>
          <input
            style={focusStyle} className={inputClass}
            placeholder={loadingEmployees ? 'Loading employees...' : 'Search your name...'}
            value={selected ? selected.full_name : search}
            onChange={e => { setSelectedId(''); setSearch(e.target.value) }}
            disabled={loadingEmployees}
          />
          {!selected && search && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-56 overflow-y-auto shadow-lg">
              {filteredEmployees.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">No employee found.</div>
              ) : filteredEmployees.map(e => (
                <button key={e.id} type="button"
                  onClick={() => selectEmployee(e)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                  {e.full_name} <span className="text-gray-400 text-xs">({e.team === 'creative' ? 'Creative' : 'Production'})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Date</label>
          <input type="date" style={focusStyle} className={inputClass} value={otDate}
            onChange={e => setOtDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Time</label>
            <input type="time" style={focusStyle} className={inputClass} value={startTime}
              onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input type="time" style={focusStyle} className={inputClass} value={endTime}
              onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Reason for Overtime</label>
          <textarea rows={3} style={focusStyle} className={inputClass} value={reason}
            onChange={e => setReason(e.target.value)} />
        </div>
      </div>

      {filedLate && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          This is {daysSinceOt} days after the overtime date. Company policy requires filing within 3 days —
          this request may not be paid unless approved with a valid reason.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSubmit} disabled={submitting || !canSubmit}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {submitting ? 'Submitting...' : '✓ Submit Overtime'}
        </button>
      </div>
    </div>
  )
}
