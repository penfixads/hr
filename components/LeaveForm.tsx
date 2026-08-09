'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MS_PER_DAY, toDate, daysInclusive, accruedCredits, isLeaveEligible, leaveEligibleFrom, ELIGIBILITY_MONTHS } from '@/lib/leave'

type EmployeeOption = { id: string; full_name: string; team: 'creative' | 'production'; date_joined: string | null }
type LeaveType = 'Sick Leave' | 'Vacation Leave'
type ExistingLeave = { employee_id: string; employee_name: string; leave_type: LeaveType; start_date: string; end_date: string; days_requested: number; filed_late: boolean }

const LEAVE_COLUMNS = 'employee_id, employee_name, leave_type, start_date, end_date, days_requested, filed_late'

// Rebuilds the legacy "PENFIX LEAVE FORM" (Name, Start of Leave, End of Leave, Type of
// Leave [Sick Leave / Vacation Leave only — Emergency/Bereavement route under Vacation
// Leave per the user's decision], Reason for Leave — none of the original fields required).
//
// Per GENERAL POLICY.docx: 5 sick + 5 vacation credits/year, accruing .42/month. Vacation
// must be filed >=3 days before the start date. Sick leave must be filed within 3 days
// after returning (end_date). Employees on the same team can't take vacation leave on
// overlapping dates. None of this blocks submission (no approval-override flow exists in
// this app yet) — it warns, and stores `filed_late` for later admin review.
export default function LeaveForm() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('Vacation Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [ownLeaves, setOwnLeaves] = useState<ExistingLeave[]>([])
  const [teamVacations, setTeamVacations] = useState<ExistingLeave[]>([])

  useEffect(() => {
    supabase.from('employees').select('id, full_name, team, date_joined').order('full_name').then(({ data }) => {
      setEmployees((data as EmployeeOption[]) ?? [])
      setLoadingEmployees(false)
    })
  }, [])

  const selected = employees.find(e => e.id === selectedId) || null
  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()))

  // Pull this employee's leave history (for credit balance) and their team's vacation
  // history (for the overlap check) once an employee is picked.
  useEffect(() => {
    if (!selected) { setOwnLeaves([]); setTeamVacations([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('leave_requests').select(LEAVE_COLUMNS)
      .eq('employee_id', selected.id)
      .then(({ data }: { data: ExistingLeave[] | null }) => setOwnLeaves(data ?? []))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('leave_requests').select(LEAVE_COLUMNS)
      .eq('team', selected.team).eq('leave_type', 'Vacation Leave')
      .then(({ data }: { data: ExistingLeave[] | null }) => setTeamVacations(data ?? []))
  }, [selectedId])

  const currentYear = new Date().getFullYear()
  // Late-filed leave is not payable per policy, so it never consumed a credit -- excluding it
  // here keeps this figure identical to computeLeaveBalances in lib/leave.ts, which My Records
  // and the admin detail page both use.
  const usedThisYear = ownLeaves
    .filter(l => l.leave_type === leaveType && !l.filed_late && toDate(l.start_date).getFullYear() === currentYear)
    .reduce((sum, l) => sum + l.days_requested, 0)
  const accrued = selected ? accruedCredits(selected.date_joined) : 0
  const remaining = accrued - usedThisYear
  const eligible = selected ? isLeaveEligible(selected.date_joined) : true
  const eligibleFrom = selected ? leaveEligibleFrom(selected.date_joined) : null

  const daysRequested = startDate && endDate && endDate >= startDate ? daysInclusive(startDate, endDate) : 0
  const exceedsBalance = daysRequested > 0 && daysRequested > remaining

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const noticeDays = startDate ? Math.floor((toDate(startDate).getTime() - today.getTime()) / MS_PER_DAY) : null
  const vacationTooSoon = leaveType === 'Vacation Leave' && noticeDays !== null && noticeDays < 3
  const daysSinceReturn = endDate ? Math.floor((today.getTime() - toDate(endDate).getTime()) / MS_PER_DAY) : null
  const sickFiledLate = leaveType === 'Sick Leave' && daysSinceReturn !== null && daysSinceReturn > 3
  const filedLate = vacationTooSoon || sickFiledLate

  const conflicts = selected && leaveType === 'Vacation Leave' && startDate && endDate
    ? teamVacations.filter(l =>
        l.employee_id !== selected.id &&
        toDate(l.start_date) <= toDate(endDate) &&
        toDate(l.end_date) >= toDate(startDate))
    : []

  const canSubmit = !!selected && !!startDate && !!endDate && endDate >= startDate

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
      team: selected.team,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      days_requested: daysRequested,
      filed_late: filedLate,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sbErr } = await (supabase as any).from('leave_requests').insert([payload])
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
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#4A0000' }}>Leave Filed!</h2>
        <p className="text-gray-600 text-lg max-w-md">
          Thank you, {selected?.full_name} — your {leaveType.toLowerCase()} from {startDate} to {endDate} has been recorded.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h3 className="text-lg font-bold mb-1" style={{ color: '#4A0000' }}>Leave Form</h3>
      <p className="text-sm text-gray-500 mb-6">
        Vacation leave must be filed at least 3 days in advance. Sick leave must be filed within 3 days
        of returning to work.
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
          <label className={labelClass}>Type of Leave</label>
          <div className="flex gap-4">
            {(['Sick Leave', 'Vacation Leave'] as LeaveType[]).map(t => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="leaveType" checked={leaveType === t} onChange={() => setLeaveType(t)} />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start of Leave</label>
            <input type="date" style={focusStyle} className={inputClass} value={startDate}
              onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>End of Leave</label>
            <input type="date" style={focusStyle} className={inputClass} value={endDate}
              onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Reason for Leave</label>
          <input style={focusStyle} className={inputClass} value={reason}
            onChange={e => setReason(e.target.value)} />
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-lg border p-4 mb-4 flex flex-wrap items-center gap-4 shadow-sm">
          <div>
            <div className="text-xs text-gray-500">{leaveType} Accrued ({currentYear})</div>
            <div className="text-lg font-bold" style={{ color: '#4A0000' }}>{accrued.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Used</div>
            <div className="text-lg font-bold" style={{ color: '#4A0000' }}>{usedThisYear}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Remaining</div>
            <div className="text-lg font-bold" style={{ color: remaining < 0 ? '#b91c1c' : '#4A0000' }}>{remaining.toFixed(2)}</div>
          </div>
          {daysRequested > 0 && (
            <div>
              <div className="text-xs text-gray-500">This Request</div>
              <div className="text-lg font-bold" style={{ color: '#4A0000' }}>{daysRequested} day{daysRequested !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      )}

      {selected && !eligible && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {selected.full_name} is not yet eligible for <b>paid</b> leave — company policy requires{' '}
          {ELIGIBILITY_MONTHS} months of service
          {eligibleFrom
            ? `, so paid leave becomes available on ${eligibleFrom.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`
            : ', and no hire date is on file for this employee — ask HR to complete the record'}
          . This request can still be filed, but the days are not payable.
        </div>
      )}

      {exceedsBalance && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          This request ({daysRequested} days) exceeds your remaining {leaveType.toLowerCase()} balance ({remaining.toFixed(2)} days).
        </div>
      )}

      {vacationTooSoon && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          Vacation leave should be filed at least 3 days before the start date
          {noticeDays !== null && noticeDays >= 0 ? ` (this is ${noticeDays} day${noticeDays !== 1 ? 's' : ''} notice)` : ' (this start date is in the past)'} — may not be credited per policy.
        </div>
      )}

      {sickFiledLate && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          This sick leave is being filed {daysSinceReturn} days after returning to work — company policy requires
          filing within 3 days, else it may not be credited.
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          Team members already on vacation leave during an overlapping period: {conflicts.map(c => c.employee_name).join(', ')}.
          Per policy, teammates can&apos;t take vacation leave at the same time.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSubmit} disabled={submitting || !canSubmit}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {submitting ? 'Submitting...' : '✓ Submit Leave'}
        </button>
      </div>
    </div>
  )
}
