'use client'

import { useState } from 'react'
import Link from 'next/link'
import AttendancePunchCard from '@/components/AttendancePunchCard'
import type { PayPeriodAttendanceSummary } from '@/lib/attendance'

const MAROON = '#4A0000'

type Entry = {
  employee: { id: string; full_name: string; employment_status: string; team: string }
  attendance: PayPeriodAttendanceSummary
}

export default function AttendanceListClient({ entries }: { entries: Entry[] }) {
  const [search, setSearch] = useState('')
  const filtered = entries.filter(e => !search || e.employee.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <input
        type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">No employees found.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(({ employee, attendance }) => (
            <details key={employee.id} open className="bg-white rounded-xl border shadow-sm p-6 group">
              <summary className="flex items-center justify-between cursor-pointer list-none mb-4 pb-2 border-b">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base" style={{ color: MAROON }}>{employee.full_name}</h3>
                  <span className="text-xs text-gray-500 capitalize">{employee.team} · {employee.employment_status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/employee/${employee.id}`} className="text-xs hover:underline" style={{ color: MAROON }} onClick={e => e.stopPropagation()}>
                    View Profile →
                  </Link>
                  <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
                </div>
              </summary>
              <AttendancePunchCard attendance={attendance} />
            </details>
          ))}
        </div>
      )}
    </>
  )
}
