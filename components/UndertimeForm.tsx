'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/text'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production' }

// Rebuilds the legacy "PENFIX UNDERTIME FORM" (Name, Date of Undertime, Time of Log In
// [helper text: "If going to work late for valid reasons"], Time of Log Out, Reason for
// Undertime — none required). No policy-specific validation rules for undertime exist in
// GENERAL POLICY.docx (unlike Overtime/Leave), so this is a plain log matching the original.
export default function UndertimeForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [undertimeDate, setUndertimeDate] = useState('')
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
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
  const canSubmit = !!selected && !!undertimeDate && reason.trim() !== ''

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
      undertime_date: undertimeDate,
      time_in: timeIn || null,
      time_out: timeOut || null,
      reason: reason.trim(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('undertime_requests').insert([payload])
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
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#D9BB6E' }}>Undertime Filed!</h2>
        <p className="text-penfix-text-muted text-lg max-w-md">
          Thank you, {titleCase(selected?.full_name)} — your undertime for {undertimeDate} has been recorded.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-penfix-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-foreground mb-1"

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/myhricons/undertime.png" alt="" className="w-8 h-8 object-contain" />
        <h3 className="text-lg font-bold" style={{ color: '#D9BB6E' }}>Undertime Form</h3>
      </div>
      <p className="text-sm text-penfix-text-muted mb-6">
        File this if you logged in late or logged out early.
      </p>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <label className={labelClass}>Name</label>
          <input
            style={focusStyle} className={inputClass}
            placeholder={loadingEmployees ? 'Loading employees...' : 'Search your name...'}
            value={selected ? titleCase(selected.full_name) : search}
            onChange={e => { setSelectedId(''); setSearch(e.target.value) }}
            disabled={loadingEmployees}
          />
          {!selected && search && (
            <div className="absolute z-10 w-full bg-penfix-card border border-penfix-border rounded-lg mt-1 max-h-56 overflow-y-auto shadow-lg">
              {filteredEmployees.length === 0 ? (
                <div className="px-3 py-2 text-sm text-penfix-text-muted">No employee found.</div>
              ) : filteredEmployees.map(e => (
                <button key={e.id} type="button"
                  onClick={() => selectEmployee(e)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-penfix-surface-muted border-b border-penfix-border last:border-0">
                  {titleCase(e.full_name)} <span className="text-penfix-text-muted text-xs">({e.team === 'creative' ? 'Creative' : 'Production'})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Date of Undertime</label>
          <input type="date" style={focusStyle} className={inputClass} value={undertimeDate}
            onChange={e => setUndertimeDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Time of Log In</label>
            <p className="text-xs text-penfix-text-muted mb-1">*If going to work late for valid reasons</p>
            <input type="time" style={focusStyle} className={inputClass} value={timeIn}
              onChange={e => setTimeIn(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Time of Log Out</label>
            <input type="time" style={focusStyle} className={inputClass} value={timeOut}
              onChange={e => setTimeOut(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Reason for Undertime</label>
          <textarea rows={4} style={focusStyle} className={inputClass} value={reason}
            onChange={e => setReason(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-penfix-border">
        <button onClick={handleSubmit} disabled={submitting || !canSubmit}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {submitting ? 'Submitting...' : '✓ Submit Undertime'}
        </button>
      </div>
    </div>
  )
}
