'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-auth'
import { createInvite, setApplicantStatus } from '@/lib/applicants-server'
import { APPLICANT_STATUSES, type ApplicantStatus } from '@/lib/applicants'

// Admin-gated: middleware.ts already blocks non-Admins from /admin/*, but these actions are
// callable directly, so the role is re-checked here — same defence-in-depth as
// app/api/attendance-log/route.ts.

export async function generateInviteAction(formData: FormData): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const admin = await getAdminSession()
  if (!admin) return { ok: false, error: 'Not authorized.' }

  const label = String(formData.get('label') ?? '').trim()
  if (!label) return { ok: false, error: "Enter the applicant's name so you can tell links apart." }

  const days = Number(formData.get('expires_days') ?? 0)
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null

  const { error, token } = await createInvite(label, admin.email, expiresAt)
  if (error || !token) return { ok: false, error: error ?? 'Could not create the link.' }

  revalidatePath('/admin/applicants')
  return { ok: true, token }
}

export async function setStatusAction(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminSession()
  if (!admin) return { ok: false, error: 'Not authorized.' }
  if (!(APPLICANT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'Invalid status.' }

  const { error } = await setApplicantStatus(id, status as ApplicantStatus)
  if (error) return { ok: false, error }
  revalidatePath('/admin/applicants')
  return { ok: true }
}
