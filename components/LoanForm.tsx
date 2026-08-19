'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production' }

const inputClass = "w-full border border-penfix-border rounded-lg px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-penfix-gold focus:border-transparent"
const labelClass = "block text-sm font-medium text-foreground mb-1"
const buttonClass = "px-8 py-2.5 rounded-lg font-semibold text-sm text-white bg-penfix-gold transition-all hover:bg-penfix-gold-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:hover:bg-penfix-gold disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold focus-visible:ring-offset-2"
const cardClass = "max-w-2xl mx-auto w-full bg-penfix-card rounded-2xl shadow-sm border border-penfix-border p-6 sm:p-8"

const MIN_PAYMENT_PER_PAYDAY = 500

// Same shape as CashAdvanceForm, but for a regular loan repaid in installments instead of
// a one-time emergency advance. Adds payment_per_payday (500 minimum per GENERAL
// POLICY.docx) and derives the number of paydays needed to pay it off.
export default function LoanForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [requestDate, setRequestDate] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentPerPayday, setPaymentPerPayday] = useState('')
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
  const amountValue = Number(amount)
  const paymentValue = Number(paymentPerPayday)
  const paymentMeetsMinimum = paymentPerPayday !== '' && paymentValue >= MIN_PAYMENT_PER_PAYDAY
  const numberOfPayments = amountValue > 0 && paymentMeetsMinimum ? Math.ceil(amountValue / paymentValue) : 0
  const canSubmit = !!selected && !!requestDate && amount !== '' && amountValue > 0
    && paymentMeetsMinimum && reason.trim() !== ''

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
      payment_per_payday: paymentValue,
      reason: reason.trim(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('loan_requests').insert([payload])
    setSubmitting(false)
    if (sbErr) {
      setError(sbErr.message || 'Submission failed. Please try again.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold mb-3 text-penfix-maroon">Request Submitted!</h2>
          <p className="text-penfix-text-muted text-lg max-w-md">
            Thank you, {selected?.full_name} — your loan request of ₱{amountValue.toLocaleString()},
            payable at ₱{paymentValue.toLocaleString()} per payday over {numberOfPayments} payday{numberOfPayments === 1 ? '' : 's'}, has been recorded.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <h3 className="text-lg font-bold mb-1 text-penfix-maroon">Loan Request</h3>
      <p className="text-sm text-penfix-text-muted mb-6">
        Fill out this form to request a regular loan, repaid in installments every payday.
      </p>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <label className={labelClass}>Name <span className="text-red-500">*</span></label>
          <input
            className={inputClass}
            placeholder={loadingEmployees ? 'Loading employees...' : 'Search your name...'}
            value={selected ? selected.full_name : search}
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
                  {e.full_name} <span className="text-penfix-text-muted text-xs">({e.team === 'creative' ? 'Creative' : 'Production'})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Date <span className="text-red-500">*</span></label>
          <input type="date" className={inputClass} value={requestDate}
            onChange={e => setRequestDate(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Loan Amount <span className="text-red-500">*</span></label>
          <input type="number" inputMode="decimal" min="0" step="0.01" className={inputClass}
            placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Amount Willing to Pay per Payday <span className="text-red-500">*</span></label>
          <input type="number" inputMode="decimal" min={MIN_PAYMENT_PER_PAYDAY} step="0.01" className={inputClass}
            placeholder={`Minimum ₱${MIN_PAYMENT_PER_PAYDAY}`} value={paymentPerPayday}
            onChange={e => setPaymentPerPayday(e.target.value)} />
          {paymentPerPayday !== '' && !paymentMeetsMinimum && (
            <p className="text-xs text-red-500 mt-1">Minimum is ₱{MIN_PAYMENT_PER_PAYDAY.toLocaleString()} per payday.</p>
          )}
        </div>

        {numberOfPayments > 0 && (
          <div className="p-3 bg-penfix-gold/10 border border-penfix-gold/30 rounded-lg text-sm text-penfix-maroon">
            This loan will be paid off in <span className="font-bold">{numberOfPayments}</span> payday{numberOfPayments === 1 ? '' : 's'}.
          </div>
        )}

        <div>
          <label className={labelClass}>Reason for Loan <span className="text-red-500">*</span></label>
          <textarea rows={3} className={inputClass} value={reason}
            onChange={e => setReason(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-penfix-border">
        <button onClick={handleSubmit} disabled={submitting || !canSubmit} className={buttonClass}>
          {submitting ? 'Submitting...' : '✓ Submit Request'}
        </button>
      </div>
    </div>
  )
}
