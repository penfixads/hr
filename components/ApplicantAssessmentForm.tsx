'use client'

import { useMemo, useState } from 'react'
import { submitAssessmentAction } from '@/app/applicant-assessment/actions'
import {
  sectionsForRole, VALUES_RANKING_ITEMS,
  type AssessmentRole, type AssessmentAnswers, type Question,
} from '@/lib/assessment'

const MAROON = '#4A0000'
const MAROON_TEXT = '#D9BB6E'
const input = 'border border-penfix-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'

// Redraws the Google Form's uploaded image as vector, so it stays sharp on a phone and the
// deliberate error can be corrected in code rather than by re-uploading a PNG. The intended
// answer is "texts are misaligned vertically": the four body lines start at different x
// positions, while the outer margins are equal and every line uses the same font size — so
// the other three options are all genuinely false.
function AlignmentGrid() {
  const lines = [
    { x: 48, text: 'Grand Opening Sale' },
    { x: 62, text: 'Tarpaulin • Stickers • Signage' },
    { x: 44, text: 'September 12 – 30' },
    { x: 57, text: 'Penfix Advertising, Poblacion' },
  ]
  return (
    <svg
      viewBox="0 0 480 240"
      className="w-full max-w-md border border-penfix-border rounded-lg bg-penfix-card"
      role="img"
      aria-label="A poster layout with a heading and four lines of text below it"
    >
      <rect x="24" y="24" width="432" height="192" fill="#FAFAF9" stroke="#E7E5E4" />
      <text x="48" y="72" fontSize="22" fontWeight="700" fill={MAROON} fontFamily="system-ui, sans-serif">
        PENFIX
      </text>
      {lines.map((l, i) => (
        <text key={l.text} x={l.x} y={110 + i * 28} fontSize="14" fill="#44403C" fontFamily="system-ui, sans-serif">
          {l.text}
        </text>
      ))}
    </svg>
  )
}

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="bg-penfix-card rounded-xl border shadow-sm p-6 mb-6">
      <h3 className="font-bold text-base mb-1 pb-2 border-b" style={{ color: MAROON_TEXT }}>{title}</h3>
      {intro && <p className="text-xs text-penfix-text-muted mt-2 mb-4">{intro}</p>}
      <div className={intro ? '' : 'mt-4'}>{children}</div>
    </div>
  )
}

// Up/down reordering rather than drag-and-drop: this is filled in on a phone as often as a
// desktop, and HTML5 drag events do not fire on touch without a library.
function Ranking({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  function move(i: number, delta: number) {
    const next = [...value]
    const j = i + delta
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <ol className="flex flex-col gap-2">
      {value.map((item, i) => (
        <li key={item} className="flex items-center gap-3 border border-penfix-border rounded-lg px-3 py-2">
          <span className="text-xs font-bold text-penfix-text-muted w-5 shrink-0">{i + 1}</span>
          <span className="text-sm text-foreground flex-1">{item}</span>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
            aria-label={`Move ${item} up`}
            className="text-xs px-2 py-1 rounded border border-penfix-border text-penfix-text-muted disabled:opacity-30">▲</button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1}
            aria-label={`Move ${item} down`}
            className="text-xs px-2 py-1 rounded border border-penfix-border text-penfix-text-muted disabled:opacity-30">▼</button>
        </li>
      ))}
    </ol>
  )
}

export default function ApplicantAssessmentForm({
  token, label, role,
}: { token: string; label: string; role: AssessmentRole }) {
  const sections = useMemo(() => sectionsForRole(role), [role])

  const [answers, setAnswers] = useState<AssessmentAnswers>({
    values_ranking: [...VALUES_RANKING_ITEMS],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  // Blank questions are only called out AFTER a submit attempt. Flagging them on first
  // paint would open the exam with 34 red warnings, which reads as "you did something
  // wrong" before the applicant has touched anything.
  const [showErrors, setShowErrors] = useState(false)

  // Only choice and short-answer questions are required; essays and the ranking are
  // optional, matching the server-side check in submitAssessmentAction().
  const requiredIds = useMemo(
    () => sections.flatMap(s => s.questions.filter(q => q.kind === 'choice' || q.kind === 'short').map(q => q.id)),
    [sections]
  )
  const unanswered = requiredIds.filter(id => {
    const v = answers[id]
    return typeof v !== 'string' || !v.trim()
  })

  function set(id: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (unanswered.length > 0) {
      setShowErrors(true)
      setError(`Please answer every question — ${unanswered.length} ${unanswered.length === 1 ? 'is' : 'are'} still blank.`)
      document.getElementById(`q-${unanswered[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('token', token)
    fd.set('answers', JSON.stringify(answers))
    try {
      const res = await submitAssessmentAction(fd)
      if (res.ok) setDone(true)
      else { setError(res.error); setSubmitting(false) }
    } catch {
      setError('Something went wrong submitting your assessment. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto bg-penfix-card rounded-xl border shadow-sm p-10 text-center">
        <p className="text-3xl mb-3">✓</p>
        <h2 className="text-xl font-bold mb-2" style={{ color: MAROON_TEXT }}>Thank you!</h2>
        <p className="text-penfix-text-muted text-sm">
          Your assessment has been submitted to Penfix HR. We&apos;ll be in touch about the next
          step. Thank you for the time you gave this.
        </p>
      </div>
    )
  }

  function renderQuestion(q: Question, number: number) {
    const missing = showErrors && unanswered.includes(q.id)
    return (
      <div key={q.id} id={`q-${q.id}`} className="py-4 border-b border-penfix-border last:border-0">
        <p className="text-sm font-medium text-foreground mb-3 whitespace-pre-line">
          <span className="text-penfix-text-muted mr-2">{number}.</span>
          {q.prompt}
          {(q.kind === 'choice' || q.kind === 'short') && <span className="text-red-600"> *</span>}
        </p>

        {q.kind === 'choice' && (
          <>
            {q.figure === 'alignment-grid' && <div className="mb-4"><AlignmentGrid /></div>}
            <div className="flex flex-col gap-2">
              {q.choices.map(c => (
                <label key={c.text}
                  className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer rounded-lg px-3 py-2 border border-penfix-border hover:bg-amber-50/40 has-[:checked]:border-amber-300 has-[:checked]:bg-amber-50">
                  <input type="radio" name={q.id} value={c.text}
                    checked={answers[q.id] === c.text}
                    onChange={() => set(q.id, c.text)}
                    className="mt-0.5 shrink-0" />
                  <span>{c.text}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {q.kind === 'short' && (
          <input
            value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
            onChange={e => set(q.id, e.target.value)}
            placeholder={q.placeholder}
            className={`${input} sm:w-48`}
          />
        )}

        {q.kind === 'essay' && (
          <textarea
            rows={4}
            value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
            onChange={e => set(q.id, e.target.value)}
            className={`${input} w-full`}
          />
        )}

        {q.kind === 'ranking' && (
          <Ranking
            value={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [...q.items]}
            onChange={next => set(q.id, next)}
          />
        )}

        {missing && <p className="text-xs text-red-600 mt-2">This one still needs an answer.</p>}
      </div>
    )
  }

  // Numbering runs across the whole exam rather than restarting per section, so an applicant
  // ringing HR can say "I'm stuck on 23" and be understood.
  let counter = 0

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="bg-penfix-card rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-1" style={{ color: MAROON_TEXT }}>Penfix Assessment</h2>
        <p className="text-sm text-penfix-text-muted">
          Hi{label ? ` ${label.split(' - ')[0]}` : ''} — this assessment is for the{' '}
          <strong className="text-foreground">{role}</strong> role. There is no timer, but please
          answer in one sitting: the link works once and your answers are only saved when you
          submit at the end.
        </p>
      </div>

      <Section title="Applicant Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Full name<span className="text-red-600"> *</span></span>
            <input name="full_name" required className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Email address<span className="text-red-600"> *</span></span>
            <input type="email" name="email" required className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Telephone number<span className="text-red-600"> *</span></span>
            <input name="phone" required inputMode="tel" className={input} />
          </label>
        </div>
      </Section>

      {sections.map(section => (
        <Section key={section.id} title={section.title} intro={section.intro}>
          {section.questions.map(q => renderQuestion(q, ++counter))}
        </Section>
      ))}

      {error && <p className="text-sm text-red-700 mb-4 text-center">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full text-white font-bold rounded-xl py-3 disabled:opacity-60"
        style={{ backgroundColor: MAROON }}>
        {submitting ? 'Submitting…' : 'Submit Assessment'}
      </button>
      <p className="text-xs text-penfix-text-muted text-center mt-3 mb-10">
        You can only submit this once. Please review your answers before sending.
      </p>
    </form>
  )
}
