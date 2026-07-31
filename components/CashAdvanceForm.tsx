'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production' }

// Rebuilds the legacy "PENFIX CASH ADVANCE FORM" Google Form (Name, Date, Amount — all
// required). Name is a search-select against `employees` instead of free text, matching
// the pattern QuarterlyEvaluationForm already uses, so requests tie to a real employee_id.
export default function CashAdvanceForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [requestDate, setRequestDate] = useState('')
  const [amount, setAmount] = useState('')
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
  const amountValue = Number(amount)
  const canSubmit = !!selected && !!requestDate && amount !== '' && amountValue > 0

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
      request_date: requestDate,
      amount: amountValue,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('cash_advance_requests').insert([payload])
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
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#4A0000' }}>Request Submitted!</h2>
        <p className="text-gray-600 text-lg max-w-md">
          Thank you, {selected?.full_name} — your cash advance request of ₱{amountValue.toLocaleString()} has been recorded.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h3 className="text-lg font-bold mb-1" style={{ color: '#4A0000' }}>Cash Advance Request</h3>
      <p className="text-sm text-gray-500 mb-6">
        Fill out this form to request a cash advance.
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
          <input type="date" style={focusStyle} className={inputClass} value={requestDate}
            onChange={e => setRequestDate(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" min="0" step="0.01" style={focusStyle} className={inputClass}
            placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSubmit} disabled={submitting || !canSubmit}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {submitting ? 'Submitting...' : '✓ Submit Request'}
        </button>
      </div>
    </div>
  )
}
