'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import BossRatingEditor from '@/components/BossRatingEditor'
import Link from 'next/link'

type Employee = {
  id: string
  full_name: string
  team: string
  employment_status: string
  skills_self_rating: Record<string, number> | null
  skills_boss_rating: Record<string, number> | null
}

function hasBossRating(emp: Employee) {
  return !!emp.skills_boss_rating && Object.values(emp.skills_boss_rating).some(v => v > 0)
}

function AssessPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const selectedId = searchParams.get('employee')

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, team, employment_status, skills_self_rating, skills_boss_rating')
      .order('full_name', { ascending: true })
    setEmployees((data as Employee[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const filtered = employees.filter(e => !search || e.full_name.toLowerCase().includes(search.toLowerCase()))
  const selected = employees.find(e => e.id === selectedId) ?? null

  const selectEmployee = (id: string) => {
    router.push(`/admin/assess?employee=${id}`)
  }

  const goToNext = () => {
    const idx = filtered.findIndex(e => e.id === selectedId)
    const next = filtered[idx + 1] ?? filtered[0]
    if (next) selectEmployee(next.id)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Skills Assessment" />

      <main className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#D9BB6E' }}>Skills Assessment</h2>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#D9BB6E' }}>← Back to Dashboard</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Employee picker */}
          <div className="bg-penfix-card rounded-xl border shadow-sm p-4 h-fit md:sticky md:top-4">
            <input
              type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-penfix-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none"
            />
            {loading ? (
              <div className="text-sm text-penfix-text-muted py-6 text-center">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-penfix-text-muted py-6 text-center">No employees found.</div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[65vh] overflow-y-auto">
                {filtered.map(emp => (
                  <button key={emp.id} onClick={() => selectEmployee(emp.id)}
                    className="text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: emp.id === selectedId ? '#4A0000' : 'transparent',
                      color: emp.id === selectedId ? '#fff' : '#D9BB6E',
                    }}>
                    <span className="truncate">{emp.full_name}</span>
                    <span
                      title={hasBossRating(emp) ? 'Rated' : 'Not yet rated'}
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: hasBossRating(emp) ? '#16a34a' : '#d1d5db' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating editor */}
          <div>
            {!selected ? (
              <div className="bg-penfix-card rounded-xl border shadow-sm p-12 text-center text-penfix-text-muted">
                Pick an employee from the list to start rating their skills.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: '#D9BB6E' }}>{selected.full_name}</h3>
                    <p className="text-sm text-penfix-text-muted capitalize">{selected.team} Team · {selected.employment_status}</p>
                  </div>
                  <button onClick={goToNext}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: '#C9A84C' }}>
                    Next Employee →
                  </button>
                </div>
                <BossRatingEditor
                  key={selected.id}
                  employeeId={selected.id}
                  team={selected.team}
                  skillsSelfRating={selected.skills_self_rating ?? {}}
                  initialBossRatings={selected.skills_boss_rating}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}

export default function AssessPage() {
  return (
    <Suspense fallback={null}>
      <AssessPageInner />
    </Suspense>
  )
}
