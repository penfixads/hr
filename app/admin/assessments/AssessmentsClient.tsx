'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { generateAssessmentInviteAction } from './actions'
import { ASSESSMENT_ROLES, RUBRIC_CRITERIA, scorePercent } from '@/lib/assessment'

const MAROON = '#4A0000'

type Assessment = {
  id: string; full_name: string; email: string; phone: string; role: string
  auto_score: number; auto_max: number; flags: string[]
  rubric: Record<string, number> | null
  reviewed_by: string | null; reviewed_at: string | null; submitted_at: string
}
type Invite = {
  token: string; label: string; role: string; created_by: string; created_at: string
  expires_at: string | null; used_at: string | null
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

// Bands are deliberately wide and unlabelled beyond a colour: the auto-score covers only the
// keyed questions, so it is a sorting aid for the reviewer, not a pass mark.
function scoreColor(pct: number) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#ca8a04'
  return '#dc2626'
}

export default function AssessmentsClient({
  assessments, invites, origin,
}: { assessments: Assessment[]; invites: Invite[]; origin: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [filter, setFilter] = useState<string>('All')

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true); setError(''); setNewLink('')
    const form = e.currentTarget
    const res = await generateAssessmentInviteAction(new FormData(form))
    setCreating(false)
    if (res.ok) { setNewLink(`${origin}/applicant-assessment/${res.token}`); form.reset(); router.refresh() }
    else setError(res.error)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500) })
  }

  const shown = filter === 'All' ? assessments : assessments.filter(a => a.role === filter)
  const pendingInvites = invites.filter(i => !i.used_at)

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: MAROON }}>Send an assessment link</h3>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs text-gray-500">Applicant name / note</span>
            <input name="label" placeholder="e.g. Juan dela Cruz — layout artist"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Role being tested</span>
            <select name="role" defaultValue="" className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="" disabled>Select…</option>
              {ASSESSMENT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Expires in</span>
            <select name="expires_days" defaultValue="14" className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="0">Never</option>
            </select>
          </label>
          <button type="submit" disabled={creating}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: MAROON }}>
            {creating ? 'Generating…' : 'Generate link'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          The role is fixed on the link — the applicant cannot change it, and it decides which
          skills module they sit.
        </p>

        {newLink && (
          <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 flex items-center gap-3 flex-wrap">
            <code className="text-xs flex-1 break-all">{newLink}</code>
            <button onClick={() => copy(newLink, 'new')} className="text-xs font-semibold px-3 py-1.5 rounded text-white" style={{ backgroundColor: MAROON }}>
              {copied === 'new' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-700 mt-3">{error}</p>}

        {pendingInvites.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">Unused links ({pendingInvites.length})</p>
            <div className="flex flex-col gap-1">
              {pendingInvites.map(i => (
                <div key={i.token} className="flex items-center gap-3 text-xs text-gray-600 border-b border-gray-50 py-1.5 flex-wrap">
                  <span className="font-medium flex-1 min-w-[140px]">{i.label}</span>
                  <span className="text-gray-400">{i.role}</span>
                  <span className="text-gray-400">{i.expires_at ? `expires ${fmt(i.expires_at)}` : 'no expiry'}</span>
                  <button onClick={() => copy(`${origin}/applicant-assessment/${i.token}`, i.token)}
                    className="underline" style={{ color: MAROON }}>
                    {copied === i.token ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['All', ...ASSESSMENT_ROLES].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${filter === r ? 'text-white' : 'text-gray-600 bg-white'}`}
            style={filter === r ? { backgroundColor: MAROON, borderColor: MAROON } : {}}>
            {r} {r === 'All' ? `(${assessments.length})` : `(${assessments.filter(a => a.role === r).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
          No assessments submitted yet. Generate a link above and send it to an applicant.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map(a => {
            const pct = scorePercent(a.auto_score, a.auto_max)
            const rubricDone = a.rubric && RUBRIC_CRITERIA.every(c => a.rubric?.[c])
            return (
              <Link key={a.id} href={`/admin/assessments/${a.id}`}
                className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 flex-wrap hover:border-amber-300">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-sm text-gray-800">{a.full_name}</p>
                  <p className="text-xs text-gray-500">{a.role} · submitted {fmt(a.submitted_at)}</p>
                </div>

                {a.flags.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {a.flags.length} to discuss
                  </span>
                )}

                <span className="text-xs font-semibold px-2 py-1 rounded-full border"
                  style={{ color: rubricDone ? '#16a34a' : '#78716c', borderColor: rubricDone ? '#bbf7d0' : '#e7e5e4' }}>
                  {rubricDone ? 'Reviewed' : 'Needs review'}
                </span>

                <div className="text-right w-20">
                  <p className="text-lg font-bold leading-none" style={{ color: scoreColor(pct) }}>{pct}%</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.auto_score}/{a.auto_max}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
