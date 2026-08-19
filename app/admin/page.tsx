'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import Link from 'next/link'
import { computeSkillsScore, raiseLabel } from '@/lib/skills'

type Employee = {
  id: string
  full_name: string
  team: string
  position: string
  employment_status: string
  submitted_at: string
  skills_self_rating: Record<string, number>
  skills_boss_rating: Record<string, number> | null
  department: string
}

type SortKey = 'full_name' | 'team' | 'submitted_at' | 'avg_score'
type SortDir = 'asc' | 'desc'

// Delegates to lib/skills.ts so this column agrees with the assessment page. It used to walk
// the stored rating keys and take a flat mean of everything it found, which both ignored the
// bonus/core split and counted any stale key left in the JSON.
function avgScore(emp: Employee) {
  return computeSkillsScore(emp.team, emp.skills_self_rating, emp.skills_boss_rating).overall
}

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('submitted_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterTeam, setFilterTeam] = useState('All')
  const [search, setSearch] = useState('')

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('submitted_at', { ascending: false })
    setEmployees((data as Employee[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const deleteEmployee = async (emp: Employee) => {
    if (!confirm(`Delete "${emp.full_name}"'s record (${emp.team})? This cannot be undone.`)) return
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) { alert(error.message || 'Failed to delete record.'); return }
    setEmployees(prev => prev.filter(e => e.id !== emp.id))
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const exportCSV = () => {
    const headers = ['Name', 'Team', 'Position', 'Status', 'Submitted', 'Self Avg', 'Boss Avg', 'Overall Avg', 'Raise']
    const rows = employees.map(emp => {
      const self = emp.skills_self_rating ?? {}
      const boss = emp.skills_boss_rating ?? {}
      const selfAvg = Object.values(self).filter(Boolean).reduce((a, b) => a + b, 0) / (Object.values(self).filter(Boolean).length || 1)
      const bossAvg = boss && Object.values(boss).filter(Boolean).length
        ? Object.values(boss).filter(Boolean).reduce((a, b) => a + b, 0) / Object.values(boss).filter(Boolean).length
        : 0
      const overall = avgScore(emp)
      const raise = raiseLabel(overall)
      return [
        emp.full_name, emp.team, emp.position, emp.employment_status,
        new Date(emp.submitted_at).toLocaleDateString(),
        selfAvg.toFixed(2), bossAvg > 0 ? bossAvg.toFixed(2) : 'N/A',
        overall > 0 ? overall.toFixed(2) : 'N/A', raise.label,
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'penfix-skills-assessment.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = employees
    .filter(e => filterTeam === 'All' || e.team === filterTeam.toLowerCase().replace(' ', '_'))
    .filter(e => !search || e.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let aVal: string | number, bVal: string | number
      if (sortKey === 'avg_score') { aVal = avgScore(a); bVal = avgScore(b) }
      else if (sortKey === 'submitted_at') { aVal = a.submitted_at; bVal = b.submitted_at }
      else { aVal = (a[sortKey] ?? '').toLowerCase(); bVal = (b[sortKey] ?? '').toLowerCase() }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalCreative = employees.filter(e => e.team === 'creative').length
  const totalProduction = employees.filter(e => e.team === 'production').length

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-xs opacity-60">
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Admin Dashboard — Skills Assessment Overview" />

      <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full">
        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Submissions', value: employees.length, color: '#F3E7D6' },
            { label: 'Creative Team', value: totalCreative, color: '#D9BB6E' },
            { label: 'Production Team', value: totalProduction, color: '#C9A84C' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-penfix-card rounded-xl shadow-sm border border-penfix-gold/40 p-5 text-center">
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-sm text-penfix-text-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
              className="border border-penfix-gold/40 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none"
            />
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
              className="border border-penfix-gold/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>All</option>
              <option>Creative Team</option>
              <option>Production Team</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Link href="/" title="Home"
              className="p-2 rounded-lg transition hover:opacity-90"
              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D9BB6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5 12 3l9 6.5" />
                <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
              </svg>
            </Link>
            <Link href="/admin/attendance"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
              Attendance
            </Link>
            <Link href="/admin/requests"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
              Requests
            </Link>
            <Link href="/admin/history"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
              History
            </Link>
            <button onClick={exportCSV}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#C9A84C', border: '1px solid #C9A84C' }}>
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-penfix-card rounded-xl shadow-sm border border-penfix-gold/40 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-penfix-text-muted">Loading submissions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-penfix-text-muted">No submissions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#4A0000', color: 'white' }}>
                    {[
                      { label: 'Name', key: 'full_name' as SortKey },
                      { label: 'Team', key: 'team' as SortKey },
                      { label: 'Position', key: null },
                      { label: 'Status', key: null },
                      { label: 'Submitted', key: 'submitted_at' as SortKey },
                      { label: 'Avg Score', key: 'avg_score' as SortKey },
                      { label: 'INTERPRETATION', key: null },
                      { label: 'Action', key: null },
                    ].map(({ label, key }) => (
                      <th key={label}
                        className={`px-4 py-3 text-left font-semibold ${key ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => key && handleSort(key)}>
                        {label}{key && <SortIcon k={key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, i) => {
                    const score = avgScore(emp)
                    const raise = raiseLabel(score)
                    return (
                      <tr key={emp.id} className={i % 2 === 0 ? 'bg-penfix-card' : 'bg-penfix-surface-muted'}>
                        <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: emp.team === 'creative' ? '#FEF3C7' : '#FEE2E2',
                              color: emp.team === 'creative' ? '#92400E' : '#991B1B',
                            }}>
                            {emp.team === 'creative' ? 'Creative' : 'Production'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-penfix-text-muted">{emp.position}</td>
                        <td className="px-4 py-3 text-penfix-text-muted">{emp.employment_status}</td>
                        <td className="px-4 py-3 text-penfix-text-muted text-xs">
                          {new Date(emp.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          {score > 0 ? (
                            <span className="font-bold text-base">{score.toFixed(1)}</span>
                          ) : <span className="text-penfix-text-muted text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3">
                          {score > 0 ? (
                            <span className="text-xs font-semibold">{raise.label}</span>
                          ) : <span className="text-penfix-text-muted text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/employee/${emp.id}`} title="View record"
                              className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>
                            <Link href={`/admin/assess?employee=${emp.id}`} title="Evaluate skills"
                              className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 17 5.5 21 7.5 13.5 2 9 9 9" />
                              </svg>
                            </Link>
                            <button onClick={() => deleteEmployee(emp)} title="Delete record"
                              className="p-1.5 rounded-lg text-white transition hover:opacity-80"
                              style={{ backgroundColor: '#4A0000', border: '1px solid #C9A84C' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" /><path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
