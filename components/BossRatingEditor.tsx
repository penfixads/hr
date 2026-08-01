'use client'

import { useState } from 'react'
import StarRating from '@/components/StarRating'
import { CREATIVE_SKILLS, PRODUCTION_SKILLS } from '@/lib/skills'

type Props = {
  employeeId: string
  team: string
  skillsSelfRating: Record<string, number>
  initialBossRatings: Record<string, number> | null
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

export default function BossRatingEditor({ employeeId, team, skillsSelfRating, initialBossRatings }: Props) {
  const [bossRatings, setBossRatings] = useState<Record<string, number>>(initialBossRatings ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const skills = team === 'creative' ? CREATIVE_SKILLS : PRODUCTION_SKILLS
  const self = skillsSelfRating ?? {}

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
      body: JSON.stringify({ employee_id: employeeId, boss_ratings: bossRatings }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else setError('Failed to save ratings. Make sure you are logged in.')
  }

  return (
    <>
      {overallAvg > 0 && (
        <div className="mb-6 flex justify-end">
          <div className="flex items-center gap-3 bg-white border rounded-xl px-5 py-3 shadow-sm">
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
        </div>
      )}

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
                                {[1, 2, 3, 4, 5].map(star => (
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
    </>
  )
}
