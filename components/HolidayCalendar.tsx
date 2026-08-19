'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { HolidayType } from '@/lib/ph-holidays'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

type HolidayRow = { id: string; holiday_date: string; name: string; type: HolidayType }

type Props = {
  // Shows the "+ Appoint a Holiday" form and the per-row remove "×" — only ever passed
  // true from the Admin Dashboard (app/admin/page.tsx). Employees viewing this on MyHR
  // (app/my-records/page.tsx) get a read-only calendar: appointing/removing a company-wide
  // holiday isn't something a regular employee should be able to do from their own page.
  editable?: boolean
}

// Single-month calendar backed by the admin-editable company_holidays table (see
// app/admin/holidays for the full year view + management UI). Shared between the Admin
// Dashboard (editable) and MyHR (read-only) so both stay in sync with one component.
export default function HolidayCalendar({ editable = false }: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`

  const [holidays, setHolidays] = useState<HolidayRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HolidayType>('regular')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchHolidays = useCallback(async () => {
    const { data } = await supabase.from('company_holidays').select('id, holiday_date, name, type').order('holiday_date')
    setHolidays((data as HolidayRow[]) ?? [])
  }, [])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  const firstWeekday = new Date(cursor.year, cursor.month - 1, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const shiftMonth = (delta: number) => {
    setCursor(c => {
      const d = new Date(c.year, c.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  const holidaysByDate = new Map(holidays.map(h => [h.holiday_date, h]))
  const monthPrefix = `${cursor.year}-${pad2(cursor.month)}`
  const monthHolidays = holidays
    .filter(h => h.holiday_date.startsWith(monthPrefix))
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate || !newName.trim()) { setFormError('Date and name are both required.'); return }
    setSaving(true)
    setFormError('')
    const { error } = await (supabase as any).from('company_holidays').insert([{ holiday_date: newDate, name: newName.trim(), type: newType }])
    setSaving(false)
    if (error) {
      setFormError(error.code === '23505' ? 'That date already has a holiday on file.' : 'Failed to add — make sure you are logged in as Admin.')
      return
    }
    setNewDate(''); setNewName(''); setNewType('regular'); setShowForm(false)
    fetchHolidays()
  }

  const removeHoliday = async (h: HolidayRow) => {
    if (!confirm(`Remove "${h.name}" (${h.holiday_date})?`)) return
    const { error } = await supabase.from('company_holidays').delete().eq('id', h.id)
    if (error) { alert('Failed to remove — make sure you are logged in as Admin.'); return }
    setHolidays(prev => prev.filter(row => row.id !== h.id))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Calendar</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{MONTH_NAMES[cursor.month - 1]} {cursor.year}</span>
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month"
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">‹</button>
          <button onClick={() => shiftMonth(1)} aria-label="Next month"
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[0.65rem] text-gray-400 font-semibold">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />
          const dateKey = `${cursor.year}-${pad2(cursor.month)}-${pad2(day)}`
          const holiday = holidaysByDate.get(dateKey)
          const isToday = dateKey === todayKey
          return (
            <span
              key={i}
              title={holiday?.name}
              className="text-xs w-7 h-7 mx-auto flex items-center justify-center rounded-full"
              style={{
                backgroundColor: isToday ? '#4A0000' : holiday?.type === 'regular' ? '#F3E7D6' : undefined,
                border: holiday?.type === 'special' ? '1.5px solid #C9A84C' : undefined,
                color: isToday ? '#fff' : holiday ? '#4A0000' : '#374151',
                fontWeight: isToday || holiday ? 700 : 400,
              }}
            >
              {day}
            </span>
          )
        })}
      </div>
      <div className="flex items-start justify-between gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-col gap-1 text-[0.7rem] text-gray-600">
          {monthHolidays.length === 0 ? (
            <span className="text-gray-400">No holidays this month.</span>
          ) : monthHolidays.map(h => (
            <div key={h.id} className="flex items-center gap-2">
              <span>
                <span className="font-semibold text-gray-900">{Number(h.holiday_date.slice(8, 10))}</span> — {h.name}
              </span>
              {editable && (
                <button onClick={() => removeHoliday(h)} title="Remove holiday"
                  className="w-4 h-4 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition text-sm leading-none shrink-0">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 text-[0.7rem] text-gray-400 shrink-0">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#F3E7D6', border: '1px solid #4A0000' }} /> Regular Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ border: '1.5px solid #C9A84C' }} /> Special Non-Working Holiday</span>
        </div>
      </div>

      {editable && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="text-xs font-semibold hover:underline" style={{ color: '#4A0000' }}>
              + Appoint a Holiday
            </button>
          ) : (
            <form onSubmit={addHoliday} className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-gray-500 font-medium">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
                  className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-900" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-[0.65rem] text-gray-500 font-medium">Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Eidul Fitr" required
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.65rem] text-gray-500 font-medium">Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value as HolidayType)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-900">
                  <option value="regular">Regular</option>
                  <option value="special">Special</option>
                </select>
              </div>
              <button type="submit" disabled={saving}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#4A0000' }}>
                {saving ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
                className="px-3 py-1.5 rounded text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              {formError && <span className="text-xs text-red-500 basis-full">{formError}</span>}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
