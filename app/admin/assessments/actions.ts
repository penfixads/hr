'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-auth'
import { createAssessmentInvite, saveRubric } from '@/lib/assessment-server'
import { ASSESSMENT_ROLES, RUBRIC_CRITERIA, type AssessmentRole, type Rubric } from '@/lib/assessment'

// Admin-gated: middleware.ts already blocks non-Admins from /admin/*, but these actions are
// callable directly, so the role is re-checked here — same defence-in-depth as
// app/admin/applicants/actions.ts.

export async function generateAssessmentInviteAction(
  formData: FormData
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const admin = await getAdminSession()
  if (!admin) return { ok: false, error: 'Not authorized.' }

  const label = String(formData.get('label') ?? '').trim()
  if (!label) return { ok: false, error: "Enter the applicant's name so you can tell links apart." }

  const role = String(formData.get('role') ?? '')
  if (!(ASSESSMENT_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: 'Choose which role this assessment is for.' }
  }

  const days = Number(formData.get('expires_days') ?? 0)
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null

  const applicantId = String(formData.get('applicant_id') ?? '').trim() || null

  const { error, token } = await createAssessmentInvite(
    label, role as AssessmentRole, admin.email, expiresAt, applicantId
  )
  if (error || !token) return { ok: false, error: error ?? 'Could not create the link.' }

  revalidatePath('/admin/assessments')
  return { ok: true, token }
}

export async function saveRubricAction(
  id: string,
  rubric: Record<string, number>,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminSession()
  if (!admin) return { ok: false, error: 'Not authorized.' }

  // Only the five known criteria, only 1-5 — the payload comes from the browser, so an
  // arbitrary object must not be written into the rubric column.
  const clean: Rubric = {}
  for (const c of RUBRIC_CRITERIA) {
    const v = Number(rubric[c])
    if (Number.isInteger(v) && v >= 1 && v <= 5) clean[c] = v
  }

  const { error } = await saveRubric(id, clean, notes.trim() || null, admin.email)
  if (error) return { ok: false, error }

  revalidatePath('/admin/assessments')
  revalidatePath(`/admin/assessments/${id}`)
  return { ok: true }
}
