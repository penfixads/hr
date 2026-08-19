'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { supabase } from '@/lib/supabase'
import type { HolidayType } from '@/lib/ph-holidays'

const REGULAR_COLOR = '#D9BB6E'
const SPECIAL_COLOR = '#F87171'
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type HolidayRow = { id: string; holiday_date: string; name: string; type: HolidayType }

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

// Small wall-calendar grid for one month, with holiday days marked. Sunday-first columns
// to match how office-time.ts / attendance-shared.ts already treat Sunday as the off day.
function MonthGrid({ year, month, holidaysByDate }: { year: number; month: number; holidaysByDate: Map<string, HolidayRow> }) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad the tail so every month renders a whole number of weeks — keeps the grid height
  // consistent across the 12-month layout instead of jittering row-to-row.
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="pf-card rounded-xl p-4">
      <p className="text-sm font-bold mb-3" style={{ color: '#D9BB6E' }}>{MONTH_NAMES[month - 1]}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[0.65rem] pf-text-muted font-semibold">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />
          const dateKey = `${year}-${pad2(month)}-${pad2(day)}`
          const holiday = holidaysByDate.get(dateKey)
          return (
            <span
              key={i}
              title={holiday?.name}
              className="text-xs w-6 h-6 mx-auto flex items-center justify-center rounded-full"
              style={holiday ? {
                backgroundColor: holiday.type === 'regular' ? REGULAR_COLOR : 'transparent',
                border: holiday.type === 'special' ? `1.5px solid ${SPECIAL_COLOR}` : undefined,
                color: holiday.type === 'regular' ? '#2A0000' : SPECIAL_COLOR,
                fontWeight: 700,
              } : undefined}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminHolidaysPage() {
  const [rows, setRows] = useState<HolidayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  // Form state for appointing a new holiday — covers both cases the Philippines actually
  // runs into: proclaiming a brand-new special day, or moving an existing date (add the
  // new date here, then delete the old row below).
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HolidayType>('regular')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('company_holidays').select('id, holiday_date, name, type').order('holiday_date')
    setRows((data as HolidayRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  const years = Array.from(new Set(rows.map(r => Number(r.holiday_date.slice(0, 4))))).sort()

  // Land on a year that actually has data instead of an empty grid on first load.
  useEffect(() => {
    if (years.length === 0 || years.includes(year)) return
    setYear(years.includes(new Date().getFullYear()) ? new Date().getFullYear() : years[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const entries = rows
    .filter(r => r.holiday_date.startsWith(String(year)))
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
  const holidaysByDate = new Map(entries.map(r => [r.holiday_date, r]))

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate || !newName.trim()) { setError('Date and name are both required.'); return }
    setSaving(true)
    setError('')
    const { error: insertError } = await (supabase as any)
      .from('company_holidays')
      .insert([{ holiday_date: newDate, name: newName.trim(), type: newType }])
    setSaving(false)
    if (insertError) {
      setError(insertError.code === '23505' ? 'That date already has a holiday on file.' : 'Failed to add — make sure you are logged in as Admin.')
      return
    }
    setNewDate(''); setNewName(''); setNewType('regular')
    fetchHolidays()
  }

  const removeHoliday = async (row: HolidayRow) => {
    if (!confirm(`Remove "${row.name}" (${row.holiday_date})?`)) return
    const { error: deleteError } = await supabase.from('company_holidays').delete().eq('id', row.id)
    if (deleteError) { alert('Failed to remove — make sure you are logged in as Admin.'); return }
    setRows(prev => prev.filter(r => r.id !== row.id))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Holidays — ${year}`} />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#D9BB6E' }}>Holidays</h2>
            <p className="text-sm pf-text-muted mt-1">
              Regular and special (non-working) holidays for {year} — appoint a new one below when Malacañang declares or moves a date.
            </p>
          </div>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#D9BB6E' }}>← Back to Dashboard</Link>
        </div>

        {/* Appoint a holiday */}
        <form onSubmit={addHoliday} className="pf-card rounded-xl p-5 mb-6 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs pf-text-muted font-medium">Date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required
              className="border border-penfix-border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs pf-text-muted font-medium">Holiday Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Eidul Fitr" required
              className="w-full border border-penfix-border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs pf-text-muted font-medium">Type</label>
            <select value={newType} onChange={e => setNewType(e.target.value as HolidayType)}
              className="border border-penfix-border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none">
              <option value="regular" className="text-black">Regular Holiday</option>
              <option value="special" className="text-black">Special Non-Working Holiday</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
            {saving ? 'Adding…' : '+ Appoint Holiday'}
          </button>
          {error && <span className="text-xs text-red-400 basis-full">{error}</span>}
        </form>

        {years.length > 1 && (
          <div className="flex items-center gap-2 mb-6">
            {years.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={y === year
                  ? { backgroundColor: '#4A0000', color: 'white', border: '1px solid #C9A84C' }
                  : { backgroundColor: 'transparent', color: '#D9BB6E', border: '1px solid #C9A84C' }}>
                {y}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mb-6 text-xs pf-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: REGULAR_COLOR }} />
            Regular Holiday
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ border: `1.5px solid ${SPECIAL_COLOR}` }} />
            Special Non-Working Holiday
          </span>
        </div>

        {loading ? (
          <div className="pf-card rounded-xl p-12 text-center pf-text-muted mb-10">Loading holidays...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {MONTH_NAMES.map((_, i) => (
              <MonthGrid key={i} year={year} month={i + 1} holidaysByDate={holidaysByDate} />
            ))}
          </div>
        )}

        <div className="pf-card rounded-xl p-6">
          <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: '#D9BB6E' }}>
            {entries.length} Holiday{entries.length === 1 ? '' : 's'} in {year}
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm pf-text-muted">No holidays on file for {year} yet — appoint one above.</p>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--penfix-border)' }}>
              {entries.map(row => (
                <div key={row.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: row.type === 'regular' ? '#2A0000' : SPECIAL_COLOR,
                        backgroundColor: row.type === 'regular' ? REGULAR_COLOR : `${SPECIAL_COLOR}1a`,
                        border: row.type === 'special' ? `1px solid ${SPECIAL_COLOR}` : undefined,
                      }}
                    >
                      {row.type === 'regular' ? 'Regular' : 'Special'}
                    </span>
                    <span className="font-medium">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm pf-text-muted">
                      {new Date(row.holiday_date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button onClick={() => removeHoliday(row)} title="Remove holiday"
                      className="text-xs px-2 py-1 rounded transition hover:opacity-70" style={{ color: SPECIAL_COLOR }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
