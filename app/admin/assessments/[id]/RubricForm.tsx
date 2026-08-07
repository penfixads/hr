'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveRubricAction } from '../actions'
import { RUBRIC_CRITERIA } from '@/lib/assessment'

const MAROON = '#4A0000'

// The human half of the score. Deliberately separate from the auto-score rather than folded
// into one number: the essays test things a key cannot mark, and averaging the two would hide
// a strong writer with weak attention (or the reverse) behind a middling total.
export default function RubricForm({
  id, initialRubric, initialNotes, reviewedBy, reviewedAt,
}: {
  id: string
  initialRubric: Record<string, number>
  initialNotes: string
  reviewedBy: string | null
  reviewedAt: string | null
}) {
  const router = useRouter()
  const [rubric, setRubric] = useState<Record<string, number>>(initialRubric)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const res = await saveRubricAction(id, rubric, notes)
    setSaving(false)
    if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000) }
    else setError(res.error ?? 'Could not save.')
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-5">
      <h3 className="font-bold text-base mb-1 pb-2 border-b" style={{ color: MAROON }}>Reviewer rubric</h3>
      <p className="text-xs text-gray-500 mt-2 mb-4">
        Score the written answers below, 1 (weak) to 5 (strong). Read the essays first — the
        auto-score above says nothing about these.
      </p>

      <div className="flex flex-col gap-3">
        {RUBRIC_CRITERIA.map(c => (
          <div key={c} className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 w-40 shrink-0">{c}</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRubric(prev => ({ ...prev, [c]: n }))}
                  aria-label={`${c}: ${n} of 5`}
                  className={`w-9 h-9 rounded-lg border text-sm font-semibold ${
                    rubric[c] === n ? 'text-white' : 'text-gray-500 bg-white hover:bg-amber-50'
                  }`}
                  style={rubric[c] === n ? { backgroundColor: MAROON, borderColor: MAROON } : {}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 mt-5">
        <span className="text-sm font-medium text-gray-700">Interview notes</span>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="What to probe at interview, gut read, anything the scores miss…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
      </label>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button type="button" onClick={save} disabled={saving}
          className="text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-60"
          style={{ backgroundColor: MAROON }}>
          {saving ? 'Saving…' : 'Save review'}
        </button>
        {saved && <span className="text-xs text-green-700">Saved.</span>}
        {error && <span className="text-xs text-red-700">{error}</span>}
        {reviewedBy && (
          <span className="text-xs text-gray-400 ml-auto">Last reviewed by {reviewedBy} · {reviewedAt}</span>
        )}
      </div>
    </div>
  )
}
