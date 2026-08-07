'use server'

import { submitAssessment, checkAssessmentInvite } from '@/lib/assessment-server'
import { sectionsForRole, type AssessmentAnswers } from '@/lib/assessment'

export type SubmitAssessmentResult = { ok: true } | { ok: false; error: string }

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// Public, unauthenticated action — the invite token is the entire trust boundary, so the
// identity fields are re-validated here and the answers are re-scored server-side inside
// submitAssessment(). checkAssessmentInvite() re-checks the token before anything is written.
export async function submitAssessmentAction(formData: FormData): Promise<SubmitAssessmentResult> {
  const token = str(formData.get('token'))
  if (!token) return { ok: false, error: 'Missing invite token.' }

  const invite = await checkAssessmentInvite(token)
  if (!invite.ok) return { ok: false, error: `This link is no longer valid (${invite.reason}).` }

  const full_name = str(formData.get('full_name'))
  const email = str(formData.get('email'))
  const phone = str(formData.get('phone'))

  if (!full_name || !email || !phone) {
    return { ok: false, error: 'Please fill in your name, email, and telephone number.' }
  }
  if (!email.includes('@')) return { ok: false, error: 'Please enter a valid email address.' }

  let answers: AssessmentAnswers
  try {
    const raw = JSON.parse(str(formData.get('answers')) ?? '{}')
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('not an object')
    answers = raw as AssessmentAnswers
  } catch {
    return { ok: false, error: 'Could not read your answers. Please try again.' }
  }

  // Every choice and short-answer question must be answered. Essays and the ranking are
  // optional — an applicant who has nothing to say about a reflection prompt should not be
  // blocked from submitting an hour's work, and a blank essay is itself information for the
  // reviewer. The question list comes from the role on the INVITE, not from the browser.
  const required: string[] = []
  for (const section of sectionsForRole(invite.role)) {
    for (const q of section.questions) {
      if (q.kind !== 'choice' && q.kind !== 'short') continue
      const given = answers[q.id]
      if (typeof given !== 'string' || !given.trim()) required.push(q.id)
    }
  }
  if (required.length > 0) {
    return {
      ok: false,
      error: `Please answer every question — ${required.length} ${required.length === 1 ? 'is' : 'are'} still blank.`,
    }
  }

  const { error } = await submitAssessment(token, { full_name, email, phone }, answers)
  if (error) return { ok: false, error }
  return { ok: true }
}
