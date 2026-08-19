'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateInviteAction, setStatusAction } from './actions'
import { APPLICANT_STATUSES, formatSalaryRange } from '@/lib/applicants'

const MAROON = '#4A0000'
const MAROON_TEXT = '#D9BB6E'

type Applicant = {
  id: string; full_name: string; email: string; mobile: string; city: string
  position_applied: string; team: string; status: string; submitted_at: string
  expected_salary_min: number; expected_salary_max: number; expected_salary_basis: string
  skills: string[]; software: string[]; years_experience: number | null
  expectations: string | null; portfolio_url: string | null; notes: string | null
  highest_education: string | null; school: string | null; course: string | null
  nickname: string | null; date_of_birth: string | null; year_graduated: number | null
  earliest_start_date: string | null; heard_about_us: string | null
}
type Experience = {
  id: string; applicant_id: string; experience_type: string; company: string; position: string
  start_date: string | null; end_date: string | null; is_current: boolean
  salary_rate: number | null; salary_basis: string | null; reason_for_leaving: string | null
}
type Invite = {
  token: string; label: string; created_by: string; created_at: string
  expires_at: string | null; used_at: string | null
}

const STATUS_COLOR: Record<string, string> = {
  New: '#ca8a04', Shortlisted: '#2563eb', Hired: '#16a34a', Rejected: '#dc2626',
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

export default function ApplicantsClient({
  applicants, experienceByApplicant, invites, origin,
}: {
  applicants: Applicant[]
  experienceByApplicant: Record<string, Experience[]>
  invites: Invite[]
  origin: string
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [filter, setFilter] = useState<string>('All')
  const [open, setOpen] = useState<string | null>(null)

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true); setError(''); setNewLink('')
    const res = await generateInviteAction(new FormData(e.currentTarget))
    setCreating(false)
    if (res.ok) { setNewLink(`${origin}/applicant-screening/${res.token}`); e.currentTarget.reset(); router.refresh() }
    else setError(res.error)
  }

  async function changeStatus(id: string, status: string) {
    const res = await setStatusAction(id, status)
    if (!res.ok) setError(res.error ?? 'Could not update status.')
    else router.refresh()
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500) })
  }

  const shown = filter === 'All' ? applicants : applicants.filter(a => a.status === filter)
  const pendingInvites = invites.filter(i => !i.used_at)

  return (
    <>
      <div className="bg-penfix-card rounded-xl border shadow-sm p-6 mb-6">
        <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: MAROON_TEXT }}>Send a screening link</h3>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <span className="text-xs text-penfix-text-muted">Applicant name / note</span>
            <input name="label" placeholder="e.g. Juan dela Cruz — layout artist"
              className="border border-penfix-border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-penfix-text-muted">Expires in</span>
            <select name="expires_days" defaultValue="14" className="border border-penfix-border rounded-lg px-3 py-2 text-sm">
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
            <p className="text-xs font-semibold text-penfix-text-muted mb-2">Unused links ({pendingInvites.length})</p>
            <div className="flex flex-col gap-1">
              {pendingInvites.map(i => (
                <div key={i.token} className="flex items-center gap-3 text-xs text-penfix-text-muted border-b border-penfix-border py-1.5 flex-wrap">
                  <span className="font-medium flex-1 min-w-[140px]">{i.label}</span>
                  <span className="text-penfix-text-muted">
                    {i.expires_at ? `expires ${fmt(i.expires_at)}` : 'no expiry'}
                  </span>
                  <button onClick={() => copy(`${origin}/applicant-screening/${i.token}`, i.token)}
                    className="underline" style={{ color: MAROON_TEXT }}>
                    {copied === i.token ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['All', ...APPLICANT_STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${filter === s ? 'text-white' : 'text-penfix-text-muted bg-penfix-card'}`}
            style={filter === s ? { backgroundColor: MAROON, borderColor: MAROON } : {}}>
            {s} {s === 'All' ? `(${applicants.length})` : `(${applicants.filter(a => a.status === s).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-penfix-card rounded-xl border shadow-sm p-12 text-center text-penfix-text-muted">
          No applications yet. Generate a link above and send it to an applicant.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map(a => {
            const exp = experienceByApplicant[a.id] ?? []
            const isOpen = open === a.id
            return (
              <div key={a.id} className="bg-penfix-card rounded-xl border shadow-sm p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold" style={{ color: MAROON_TEXT }}>{a.full_name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: STATUS_COLOR[a.status], backgroundColor: `${STATUS_COLOR[a.status]}1a` }}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-penfix-text-muted mt-1 capitalize">
                      {a.position_applied} · {a.team} · {a.city}
                    </p>
                    <p className="text-xs text-penfix-text-muted">
                      Expects {formatSalaryRange(a.expected_salary_min, a.expected_salary_max, a.expected_salary_basis)}
                      {a.years_experience !== null && ` · ${a.years_experience} yr experience`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={a.status} onChange={e => changeStatus(a.id, e.target.value)}
                      className="border border-penfix-border rounded px-2 py-1 text-xs">
                      {APPLICANT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setOpen(isOpen ? null : a.id)} className="text-xs underline" style={{ color: MAROON_TEXT }}>
                      {isOpen ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t text-sm flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <span><b>Email:</b> {a.email}</span>
                      <span><b>Mobile:</b> {a.mobile}</span>
                      <span><b>Nickname:</b> {a.nickname || '—'}</span>
                      <span><b>Date of birth:</b> {fmt(a.date_of_birth)}</span>
                      <span><b>Can start:</b> {fmt(a.earliest_start_date)}</span>
                      <span><b>Heard about us:</b> {a.heard_about_us || '—'}</span>
                      <span><b>Education:</b> {a.highest_education || '—'}</span>
                      <span><b>School:</b> {a.school || '—'}{a.course ? ` — ${a.course}` : ''}{a.year_graduated ? ` (${a.year_graduated})` : ''}</span>
                      <span className="sm:col-span-2"><b>Submitted:</b> {fmt(a.submitted_at)}</span>
                    </div>

                    {a.skills.length > 0 && (
                      <div><b className="text-xs">Skills:</b> <span className="text-xs text-penfix-text-muted">{a.skills.join(', ')}</span></div>
                    )}
                    {a.software.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <b className="text-xs">Software:</b>
                        {a.software.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-penfix-surface-muted text-penfix-text-muted">{s}</span>
                        ))}
                      </div>
                    )}
                    {a.portfolio_url && (
                      <div className="text-xs">
                        <b>Portfolio:</b>{' '}
                        <a href={a.portfolio_url} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: MAROON_TEXT }}>
                          {a.portfolio_url}
                        </a>
                      </div>
                    )}

                    <div>
                      <b className="text-xs">Work experience</b>
                      {exp.length === 0 ? (
                        <p className="text-xs text-penfix-text-muted mt-1">None provided.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2">
                          {exp.map(e => (
                            <div key={e.id} className="border border-penfix-border rounded-lg p-3 text-xs">
                              <div className="flex justify-between flex-wrap gap-2">
                                <span className="font-semibold">{e.position} — {e.company}</span>
                                <span className="text-penfix-text-muted">{e.experience_type}</span>
                              </div>
                              <div className="text-penfix-text-muted mt-1">
                                {fmt(e.start_date)} – {e.is_current ? 'Present' : fmt(e.end_date)}
                                {e.salary_rate !== null && ` · ₱${Number(e.salary_rate).toLocaleString('en-PH')} / ${e.salary_basis ?? ''}`}
                              </div>
                              {e.reason_for_leaving && <div className="text-penfix-text-muted mt-1">Left: {e.reason_for_leaving}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {a.expectations && (
                      <div className="text-xs"><b>Expectations from the company:</b> <span className="text-penfix-text-muted">{a.expectations}</span></div>
                    )}
                    {a.notes && <div className="text-xs"><b>Notes:</b> <span className="text-penfix-text-muted">{a.notes}</span></div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
