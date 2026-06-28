'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import StarRating from '@/components/StarRating'
import Link from 'next/link'
import { CREATIVE_SKILLS, PRODUCTION_SKILLS } from '@/lib/skills'

type Employee = {
  id: string
  full_name: string
  nickname: string
  employee_number: string
  date_of_birth: string
  position: string
  department: string
  employment_status: string
  date_joined: string
  address: string
  mobile: string
  telephone: string
  email: string
  sss_number: string
  pagibig_number: string
  philhealth_number: string
  emergency_name: string
  emergency_relationship: string
  emergency_mobile: string
  emergency_alt: string
  team: string
  skills_self_rating: Record<string, number>
  skills_boss_rating: Record<string, number> | null
  submitted_at: string
}

function scoreColor(score: number) {
  if (score >= 4) return '#16a34a'
  if (score >= 3) return '#ca8a04'
  return '#dc2626'
}

function raiseLabel(score: number) {
  if (score >= 4.5) return { label: 'Excellent', note: 'High raise consideration', color: '#16a34a' }
  if (score >= 3.5) return { label: 'Good', note: 'Standard raise consideration', color: '#2563eb' }
  if (score >= 2.5) return { label: 'Average', note: 'Minimal raise consideration', color: '#ca8a04' }
  return { label: 'Needs Improvement', note: 'No raise recommended', color: '#dc2626' }
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [bossRatings, setBossRatings] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('employees').select('*').eq('id', id).single()
      if (data) {
        setEmployee(data as Employee)
        setBossRatings((data as Employee).skills_boss_rating ?? {})
      }
    }
    load()
  }, [id])

  if (!employee) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader />
        <main className="flex-1 flex items-center justify-center text-gray-400">Loading employee profile...</main>
        <PenfixFooter />
      </div>
    )
  }

  const skills = employee.team === 'creative' ? CREATIVE_SKILLS : PRODUCTION_SKILLS
  const self = employee.skills_self_rating ?? {}

  const allSkillsForAvg = Object.values(skills).flat() as string[]
  const overallAvg = (() => {
    let total = 0, count = 0
    allSkillsForAvg.forEach(skill => {
      const s = self[skill] ?? 0
      const b = bossRatings[skill] ?? 0
      if (s > 0 || b > 0) {
        const avg = (s > 0 && b > 0) ? (s + b) / 2 : s || b
        total += avg; count++
      }
    })
    return count > 0 ? total / count : 0
  })()

  const raise = raiseLabel(overallAvg)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/boss-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: id, boss_ratings: bossRatings }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else setError('Failed to save ratings. Make sure you are logged in.')
  }

  const infoRow = (label: string, value?: string) => value ? (
    <div key={label} className="flex gap-2 text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Profile: ${employee.full_name}`} />

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
          {overallAvg > 0 && (
            <div className="ml-auto flex items-center gap-3 bg-white border rounded-xl px-5 py-3 shadow-sm">
              <div>
                <div className="text-xs text-gray-500">Overall Score</div>
                <div className="text-2xl font-bold" style={{ color: scoreColor(overallAvg) }}>{overallAvg.toFixed(2)}</div>
              </div>
              <div className="border-l pl-3">
                <div className="text-xs text-gray-500">December Raise</div>
                <div className="font-bold text-sm" style={{ color: raise.color }}>{raise.label}</div>
                <div className="text-xs text-gray-400">{raise.note}</div>
              </div>
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: '#4A0000' }}>Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              {infoRow('Full Name', employee.full_name)}
              {infoRow('Nickname', employee.nickname)}
              {infoRow('Employee Number', employee.employee_number)}
              {infoRow('Date of Birth', employee.date_of_birth)}
              {infoRow('Position', employee.position)}
              {infoRow('Department', employee.department)}
              {infoRow('Employment Status', employee.employment_status)}
              {infoRow('Date Joined', employee.date_joined)}
            </div>
            <div>
              {infoRow('Mobile', employee.mobile)}
              {infoRow('Telephone', employee.telephone)}
              {infoRow('Email', employee.email)}
              {infoRow('Address', employee.address)}
              {infoRow('SSS Number', employee.sss_number)}
              {infoRow('Pag-IBIG Number', employee.pagibig_number)}
              {infoRow('PhilHealth Number', employee.philhealth_number)}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: '#4A0000' }}>Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {infoRow('Name', employee.emergency_name)}
            {infoRow('Relationship', employee.emergency_relationship)}
            {infoRow('Mobile', employee.emergency_mobile)}
            {infoRow('Alternative Contact', employee.emergency_alt)}
          </div>
        </div>

        {/* Skills Assessment */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h3 className="font-bold text-base" style={{ color: '#4A0000' }}>Skills Assessment</h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span style={{ color: '#C9A84C' }}>★</span> Self</span>
              <span className="flex items-center gap-1"><span style={{ color: '#4A0000' }}>★</span> Boss Allen</span>
              <span className="flex items-center gap-1 font-semibold">= Average</span>
            </div>
          </div>

          {Object.entries(skills).map(([category, skillList]) => {
            const catSkills = skillList as string[]
            const catRated = catSkills.filter(s => (self[s] ?? 0) > 0 || (bossRatings[s] ?? 0) > 0)
            const catAvg = catRated.length > 0
              ? catRated.reduce((sum, s) => {
                const sv = self[s] ?? 0; const bv = bossRatings[s] ?? 0
                return sum + ((sv > 0 && bv > 0) ? (sv + bv) / 2 : sv || bv)
              }, 0) / catRated.length
              : 0

            return (
              <div key={category} className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm" style={{ color: '#4A0000' }}>{category}</h4>
                  {catAvg > 0 && (
                    <span className="text-sm font-bold" style={{ color: scoreColor(catAvg) }}>
                      Category Avg: {catAvg.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left py-2 pr-4 font-medium">Skill</th>
                        <th className="text-center py-2 px-3 font-medium w-40">Self Rating</th>
                        <th className="text-center py-2 px-3 font-medium w-40">Boss Allen</th>
                        <th className="text-center py-2 px-3 font-medium w-24">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSkills.map((skill) => {
                        const s = self[skill] ?? 0
                        const b = bossRatings[skill] ?? 0
                        const avg = (s > 0 && b > 0) ? (s + b) / 2 : s > 0 ? s : b > 0 ? b : 0
                        return (
                          <tr key={skill} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 pr-4 text-gray-700">{skill}</td>
                            <td className="py-3 px-3 text-center">
                              {s > 0 ? (
                                <div className="flex items-center justify-center">
                                  <StarRating value={s} readonly size="sm" />
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex justify-center">
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map(star => (
                                    <button key={star} type="button"
                                      onClick={() => setBossRatings(prev => ({ ...prev, [skill]: star }))}
                                      className="text-lg hover:scale-110 transition-transform cursor-pointer">
                                      <span style={{ color: star <= b ? '#4A0000' : '#D1D5DB' }}>★</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {avg > 0 ? (
                                <span className="font-bold" style={{ color: scoreColor(avg) }}>{avg.toFixed(1)}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* Save Boss Ratings */}
        <div className="flex items-center gap-4 justify-end mb-8">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {saved && <p className="text-green-600 text-sm font-semibold">✓ Ratings saved!</p>}
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-60 shadow"
            style={{ backgroundColor: '#4A0000' }}>
            {saving ? 'Saving...' : '💾 Save Boss Allen\'s Ratings'}
          </button>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
