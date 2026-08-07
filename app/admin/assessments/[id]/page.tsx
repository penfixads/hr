import Link from 'next/link'
import { notFound } from 'next/navigation'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getAssessment } from '@/lib/assessment-server'
import { sectionsForRole, scorePercent, type AssessmentRole } from '@/lib/assessment'
import RubricForm from './RubricForm'

export const metadata = { title: 'Assessment — Penfix HR' }

// Admin-gated by middleware.ts. This is the ONLY place a score is ever rendered — the
// applicant's own view never shows one.
export const dynamic = 'force-dynamic'

const MAROON = '#4A0000'

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getAssessment(id)
  if (!row) notFound()

  const role = row.role as AssessmentRole
  const answers = (row.answers ?? {}) as Record<string, string | string[]>
  const flags: string[] = row.flags ?? []
  const pct = scorePercent(row.auto_score, row.auto_max)

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Applicant Assessment" />
      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <Link href="/admin/assessments" className="text-sm hover:underline" style={{ color: MAROON }}>
          ← All assessments
        </Link>

        <div className="bg-white rounded-xl border shadow-sm p-6 my-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold" style={{ color: MAROON }}>{row.full_name}</h2>
              <p className="text-sm text-gray-500 mt-1">{row.role}</p>
              <p className="text-xs text-gray-400 mt-2">
                {row.email} · {row.phone}
              </p>
              <p className="text-xs text-gray-400">Submitted {fmt(row.submitted_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold leading-none" style={{ color: MAROON }}>{pct}%</p>
              <p className="text-xs text-gray-400 mt-1">{row.auto_score} of {row.auto_max} keyed</p>
            </div>
          </div>

          {flags.length > 0 && (
            <div className="mt-5 p-3 rounded-lg border border-red-200 bg-red-50">
              <p className="text-xs font-semibold text-red-800 mb-1">
                {flags.length} answer{flags.length === 1 ? '' : 's'} worth raising at interview
              </p>
              <p className="text-xs text-red-700">
                Marked in red below. These are conversation starters, not disqualifiers — self-report
                integrity questions are easy to answer the way people think we want.
              </p>
            </div>
          )}
        </div>

        <RubricForm
          id={row.id}
          initialRubric={(row.rubric ?? {}) as Record<string, number>}
          initialNotes={row.reviewer_notes ?? ''}
          reviewedBy={row.reviewed_by}
          reviewedAt={row.reviewed_at ? fmt(row.reviewed_at) : null}
        />

        {sectionsForRole(role).map(section => (
          <div key={section.id} className="bg-white rounded-xl border shadow-sm p-6 mb-5">
            <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: MAROON }}>
              {section.title}
              {!section.scored && <span className="ml-2 text-xs font-normal text-gray-400">not auto-scored</span>}
            </h3>

            <div className="flex flex-col gap-4">
              {section.questions.map(q => {
                const given = answers[q.id]
                const flagged = flags.includes(q.id)

                let verdict: 'correct' | 'wrong' | null = null
                if (section.scored && q.kind === 'choice') {
                  const chosen = q.choices.find(c => c.text === given)
                  verdict = chosen?.weight === 'best' ? 'correct' : 'wrong'
                } else if (section.scored && q.kind === 'short') {
                  const norm = (v: string) => v.trim().toLowerCase().replace(/[.\s]+$/, '')
                  verdict = typeof given === 'string' && q.accept.some(a => norm(a) === norm(given)) ? 'correct' : 'wrong'
                }

                return (
                  <div key={q.id} className="text-sm">
                    <p className="text-gray-500 text-xs mb-1 whitespace-pre-line">{q.prompt}</p>

                    {q.kind === 'ranking' ? (
                      <ol className="list-decimal list-inside text-gray-800">
                        {(Array.isArray(given) ? given : []).map(item => <li key={item}>{item}</li>)}
                      </ol>
                    ) : (
                      <p
                        className={`whitespace-pre-line rounded px-2 py-1.5 ${
                          flagged
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : verdict === 'correct'
                              ? 'bg-green-50 text-green-900'
                              : verdict === 'wrong'
                                ? 'bg-amber-50 text-amber-900'
                                : 'text-gray-800'
                        }`}
                      >
                        {typeof given === 'string' && given.trim()
                          ? given
                          : <span className="text-gray-400 italic">No answer</span>}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>
      <PenfixFooter />
    </div>
  )
}
