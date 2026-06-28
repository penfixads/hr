'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import Link from 'next/link'

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

function avgScore(emp: Employee) {
  const self = emp.skills_self_rating ?? {}
  const boss = emp.skills_boss_rating ?? {}
  const allSkills = new Set([...Object.keys(self), ...Object.keys(boss)])
  if (allSkills.size === 0) return 0
  let total = 0, count = 0
  allSkills.forEach(skill => {
    const s = self[skill] ?? 0
    const b = boss[skill] ?? 0
    if (s > 0 || b > 0) {
      const avg = (s > 0 && b > 0) ? (s + b) / 2 : s || b
      total += avg; count++
    }
  })
  return count > 0 ? total / count : 0
}

function scoreColor(score: number) {
  if (score >= 4) return '#16a34a'
  if (score >= 3) return '#ca8a04'
  if (score >= 2) return '#dc2626'
  return '#6b7280'
}

function raiseLabel(score: number) {
  if (score >= 4.5) return { label: 'Excellent', note: 'High raise consideration', color: '#16a34a' }
  if (score >= 3.5) return { label: 'Good', note: 'Standard raise consideration', color: '#2563eb' }
  if (score >= 2.5) return { label: 'Average', note: 'Minimal raise consideration', color: '#ca8a04' }
  return { label: 'Needs Improvement', note: 'No raise recommended', color: '#dc2626' }
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

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
    const checkAuth = async () => {
      const res = await fetch('/api/admin-check')
      if (res.ok) { setAuthed(true); fetchEmployees() }
    }
    checkAuth()
  }, [fetchEmployees])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const res = await fetch('/api/admin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true); fetchEmployees() }
    else { setLoginError('Incorrect password. Please try again.') }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' })
    setAuthed(false)
    setEmployees([])
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

  if (!authed) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#4A0000' }}>Admin Access</h2>
              <p className="text-center text-gray-500 text-sm mb-6">Enter the admin password to continue</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password" required autoFocus
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#C9A84C' } as React.CSSProperties}
                />
                {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
                <button type="submit" disabled={loginLoading}
                  className="w-full py-3 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#4A0000' }}>
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        </main>
        <PenfixFooter />
      </div>
    )
  }

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
            { label: 'Total Submissions', value: employees.length, color: '#4A0000' },
            { label: 'Creative Team', value: totalCreative, color: '#6B0000' },
            { label: 'Production Team', value: totalProduction, color: '#A8872C' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-5 text-center">
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none"
            />
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>All</option>
              <option>Creative Team</option>
              <option>Production Team</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#C9A84C' }}>
              ↓ Export CSV
            </button>
            <button onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition hover:bg-gray-50"
              style={{ borderColor: '#4A0000', color: '#4A0000' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading submissions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No submissions found.</div>
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
                      { label: 'Raise', key: null },
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
                      <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                        <td className="px-4 py-3 text-gray-600">{emp.position}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.employment_status}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(emp.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          {score > 0 ? (
                            <span className="font-bold text-base" style={{ color: scoreColor(score) }}>
                              {score.toFixed(1)}
                            </span>
                          ) : <span className="text-gray-400 text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3">
                          {score > 0 ? (
                            <span className="text-xs font-semibold" style={{ color: raise.color }}>{raise.label}</span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/employee/${emp.id}`}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition hover:opacity-80"
                            style={{ backgroundColor: '#4A0000' }}>
                            View
                          </Link>
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
