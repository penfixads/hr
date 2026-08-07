// Server-only: reads SUPABASE_SERVICE_ROLE_KEY, which must never reach the browser.
// Only ever imported from server components and 'use server' actions — same contract as
// lib/applicants-server.ts.
import { createClient } from '@supabase/supabase-js'
import {
  scoreAssessment, ASSESSMENT_ROLES,
  type AssessmentRole, type AssessmentAnswers, type Rubric,
} from '@/lib/assessment'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service-role env vars are not configured.')
  return createClient(url, key, { auth: { persistSession: false } })
}

export type AssessmentInviteState =
  | { ok: true; label: string; role: AssessmentRole; applicantId: string | null }
  | { ok: false; reason: 'not-found' | 'expired' | 'used' }

// Same trust model as the screening form: the token is the applicant's only credential,
// re-checked on every render and again on submit so a stale tab cannot post to a consumed
// invite. `kind` is checked too — a screening token must not open the exam, or the exam's
// role branching would have nothing to branch on.
export async function checkAssessmentInvite(token: string): Promise<AssessmentInviteState> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, reason: 'not-found' }

  const { data } = await admin()
    .from('applicant_invites')
    .select('label, role, kind, applicant_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!data || data.kind !== 'assessment') return { ok: false, reason: 'not-found' }
  if (data.used_at) return { ok: false, reason: 'used' }
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) {
    return { ok: false, reason: 'expired' }
  }
  if (!(ASSESSMENT_ROLES as readonly string[]).includes(data.role as string)) {
    // A row that passed the DB check constraint but holds a role this build no longer
    // knows about — refuse rather than render an exam with no questions.
    return { ok: false, reason: 'not-found' }
  }

  return {
    ok: true,
    label: data.label as string,
    role: data.role as AssessmentRole,
    applicantId: (data.applicant_id as string | null) ?? null,
  }
}

export async function createAssessmentInvite(
  label: string,
  role: AssessmentRole,
  createdBy: string,
  expiresAt: string | null,
  applicantId: string | null
) {
  const { data, error } = await admin()
    .from('applicant_invites')
    .insert({ label, kind: 'assessment', role, created_by: createdBy, expires_at: expiresAt, applicant_id: applicantId })
    .select('token')
    .single()
  if (error) return { error: error.message, token: null }
  return { error: null, token: data.token as string }
}

export async function listAssessmentInvites() {
  const { data } = await admin()
    .from('applicant_invites')
    .select('token, label, role, created_by, created_at, expires_at, used_at')
    .eq('kind', 'assessment')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export type AssessmentIdentity = { full_name: string; email: string; phone: string }

// Scoring happens HERE, never in the browser: the client posts answers only, and the score
// it would have computed is ignored. The role comes from the invite rather than the form
// body for the same reason — otherwise an applicant could post 'Client Frontliner' to skip
// the technical module while sitting the exam for a different job.
export async function submitAssessment(
  token: string,
  identity: AssessmentIdentity,
  answers: AssessmentAnswers
) {
  const invite = await checkAssessmentInvite(token)
  if (!invite.ok) return { error: `This link is no longer valid (${invite.reason}).`, id: null }

  const { score, max, flags, askedIds } = scoreAssessment(invite.role, answers)

  const db = admin()
  const { data, error } = await db
    .from('applicant_assessments')
    .insert({
      invite_token: token,
      applicant_id: invite.applicantId,
      full_name: identity.full_name,
      email: identity.email,
      phone: identity.phone,
      role: invite.role,
      answers,
      auto_score: score,
      auto_max: max,
      flags,
      asked_ids: askedIds,
    })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }

  // Only consumed once the row is safely written — a failure above leaves the link usable
  // so the applicant can retry rather than losing an hour of answers.
  await db.from('applicant_invites').update({ used_at: new Date().toISOString() }).eq('token', token)
  return { error: null, id: data.id as string }
}

export async function listAssessments() {
  const { data } = await admin()
    .from('applicant_assessments')
    .select('id, full_name, email, phone, role, auto_score, auto_max, flags, rubric, reviewed_by, reviewed_at, submitted_at')
    .order('submitted_at', { ascending: false })
  return data ?? []
}

export async function getAssessment(id: string) {
  const { data } = await admin()
    .from('applicant_assessments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function saveRubric(id: string, rubric: Rubric, notes: string | null, reviewer: string) {
  const { error } = await admin()
    .from('applicant_assessments')
    .update({
      rubric,
      reviewer_notes: notes,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
  return { error: error?.message ?? null }
}
