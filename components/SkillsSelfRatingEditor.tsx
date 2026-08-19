'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StarRating from './StarRating'
import { getSkillsForTeam, isBonusCategory, BONUS_CATEGORY_NOTE } from '@/lib/skills'

interface Props {
  employeeId: string
  team: string
  initial: Record<string, number>
}

export default function SkillsSelfRatingEditor({ employeeId, team, initial }: Props) {
  const router = useRouter()
  const skills = getSkillsForTeam(team)
  const [ratings, setRatings] = useState<Record<string, number>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const setRating = (skill: string, val: number) =>
    setRatings(prev => ({ ...prev, [skill]: val }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: sbErr } = await (supabase as any)
        .from('employees')
        .update({ skills_self_rating: ratings })
        .eq('id', employeeId)
      if (sbErr) throw sbErr
      setSaved(true)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-penfix-card rounded-xl border p-5 space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1" style={{ color: '#D9BB6E' }}>Skills Self-Assessment</h3>
        <p className="text-sm text-penfix-text-muted mb-4">
          Update your ratings as your skills improve: 1 = No knowledge · 2 = Basic · 3 = Intermediate · 4 = Advanced · 5 = Expert
        </p>
        {Object.entries(skills).map(([category, skillList]) => (
          <div key={category} className="mb-6">
            <h4 className={`font-semibold text-sm pb-2 border-b-2 ${isBonusCategory(team, category) ? 'mb-1' : 'mb-3'}`} style={{ color: '#D9BB6E', borderColor: '#C9A84C' }}>
              {category}
            </h4>
            {/* Without this note a GA rating themselves "1 - No knowledge" on seven machine
                rows reasonably assumes they are failing the assessment. They are not. */}
            {isBonusCategory(team, category) && (
              <p className="text-xs text-penfix-text-muted mb-3">{BONUS_CATEGORY_NOTE}</p>
            )}
            <div className="space-y-3">
              {(skillList as string[]).map((skill) => (
                <div key={skill} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-penfix-surface-muted rounded-lg">
                  <span className="text-sm text-foreground flex-1">{skill}</span>
                  <StarRating value={ratings[skill] || 0} onChange={val => setRating(skill, val)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {saved && !error && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">Skills ratings saved.</div>
      )}

      <div className="flex justify-end pt-2 border-t border-penfix-border">
        <button onClick={handleSave} disabled={saving}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {saving ? 'Saving...' : '✓ Save Skills Ratings'}
        </button>
      </div>
    </div>
  )
}
