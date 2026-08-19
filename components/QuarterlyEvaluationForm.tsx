'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import NumberRating from './NumberRating'
import { getFifteenPointItems, computeFifteenPointTotal, computeFifteenPointPercentage, fifteenPointBand } from '@/lib/fifteenPoint'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production' }

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const CURRENT_YEAR = new Date().getFullYear()

// Penfix's recurring quarterly self-evaluation — same 15-point criteria as the onboarding
// form's skills step used to (briefly) include, but this is the real repeatable version:
// pick yourself + the quarter, rate, submit. Each employee/quarter/year combination is its
// own row (see supabase/schema.sql's `quarterly_evaluations`), so history accumulates
// instead of overwriting.
export default function QuarterlyEvaluationForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [quarter, setQuarter] = useState('Q1')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [ratings, setRatings] = useState<Record<string, number>>({})
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
  const items = selected ? getFifteenPointItems(selected.team) : []

  function selectEmployee(emp: EmployeeOption) {
    setSelectedId(emp.id)
    setSearch('')
    const init: Record<string, number> = {}
    getFifteenPointItems(emp.team).forEach(item => { init[item] = 0 })
    setRatings(init)
  }

  const setRating = (item: string, val: number) => setRatings(prev => ({ ...prev, [item]: val }))
  const total = computeFifteenPointTotal(ratings, items)
  const percentage = computeFifteenPointPercentage(total)
  const band = fifteenPointBand(percentage)

  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()))

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    setError('')
    const payload = {
      employee_id: selected.id,
      employee_name: selected.full_name,
      team: selected.team,
      quarter, year,
      ratings, total, percentage,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('quarterly_evaluations').insert([payload])
    setSubmitting(false)
    if (sbErr) {
      setError(sbErr.code === '23505'
        ? `You've already submitted a self-evaluation for ${quarter} ${year}.`
        : (sbErr.message || 'Submission failed. Please try again.'))
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#D9BB6E' }}>Evaluation Submitted!</h2>
        <p className="text-penfix-text-muted text-lg max-w-md">
          Thank you, {selected?.full_name} — your {quarter} {year} self-evaluation has been recorded.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-penfix-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-foreground mb-1"

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h3 className="text-lg font-bold mb-1" style={{ color: '#D9BB6E' }}>15-Point Quarterly Self-Evaluation</h3>
      <p className="text-sm text-penfix-text-muted mb-6">
        Same 15 qualifications used in Penfix&apos;s manual quarterly evaluation. Pick yourself and
        the quarter, then rate yourself honestly from 1 (needs guidance) to 10 (excellent).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="sm:col-span-3 relative">
          <label className={labelClass}>Employee</label>
          <input
            style={focusStyle} className={inputClass}
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
          <label className={labelClass}>Quarter</label>
          <select style={focusStyle} className={inputClass} value={quarter} onChange={e => setQuarter(e.target.value)}>
            {QUARTERS.map(q => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Year</label>
          <input type="number" style={focusStyle} className={inputClass} value={year}
            onChange={e => setYear(Number(e.target.value))} />
        </div>
      </div>

      {selected && (
        <>
          <div className="bg-penfix-card rounded-lg border p-4 mb-6 flex flex-wrap items-center gap-4 shadow-sm">
            <div>
              <div className="text-xs text-penfix-text-muted">Total</div>
              <div className="text-lg font-bold" style={{ color: '#D9BB6E' }}>{total} / 150</div>
            </div>
            <div>
              <div className="text-xs text-penfix-text-muted">Percentage</div>
              <div className="text-lg font-bold" style={{ color: '#D9BB6E' }}>{percentage.toFixed(1)}%</div>
            </div>
            {total > 0 && (
              <div>
                <div className="text-xs text-penfix-text-muted">Rating</div>
                <div className="text-lg font-bold" style={{ color: band.color }}>{band.label}</div>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {items.map((item, i) => (
              <div key={item} className="flex flex-col gap-2 p-3 bg-penfix-card rounded-lg border border-penfix-border">
                <span className="text-sm text-foreground"><span className="text-penfix-text-muted">{i + 1}.</span> {item}</span>
                <NumberRating value={ratings[item] || 0} onChange={val => setRating(item, val)} />
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex justify-end pt-4 border-t border-penfix-border">
            <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#C9A84C' }}>
              {submitting ? 'Submitting...' : '✓ Submit Evaluation'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
