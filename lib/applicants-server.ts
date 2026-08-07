// Server-only: reads SUPABASE_SERVICE_ROLE_KEY, which must never reach the browser.
// Only ever imported from server components and 'use server' actions. (The `server-only`
// package, which would enforce this at build time, isn't a dependency of this project.)
import { createClient } from '@supabase/supabase-js'
import type { ApplicantSubmission, ApplicantStatus } from '@/lib/applicants'

// Service-role client against THIS app's own Supabase project (employees, requests, and
// now applicants) — not the Penfix OS project. The applicant tables have RLS enabled with
// no policies, so this is the only path that can touch them; see the header comment in
// supabase/CATCHUP_applicant_screening.sql for why anon is locked out entirely.
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service-role env vars are not configured.')
  return createClient(url, key, { auth: { persistSession: false } })
}

export type InviteState =
  | { ok: true; label: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'used' }

// The invite token is the applicant's ONLY credential — no account, no password. Checked
// server-side on every render and again on submit, so a stale tab cannot post to a
// consumed invite.
export async function checkInvite(token: string): Promise<InviteState> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, reason: 'not-found' }

  const { data } = await admin()
    .from('applicant_invites')
    .select('label, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) return { ok: false, reason: 'not-found' }
  if (data.used_at) return { ok: false, reason: 'used' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { ok: false, reason: 'expired' }
  return { ok: true, label: data.label as string }
}

export async function createInvite(label: string, createdBy: string, expiresAt: string | null) {
  const { data, error } = await admin()
    .from('applicant_invites')
    .insert({ label, created_by: createdBy, expires_at: expiresAt })
    .select('token')
    .single()
  if (error) return { error: error.message, token: null }
  return { error: null, token: data.token as string }
}

export async function listInvites() {
  const { data } = await admin()
    .from('applicant_invites')
    .select('token, label, created_by, created_at, expires_at, used_at')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

// Writes the applicant, their experience rows, and marks the invite used. Supabase has no
// client-side transaction, so ordering matters: the applicant row is inserted first (the
// experience rows need its id), and the invite is only consumed once everything else
// succeeded — a failure part-way leaves the invite usable so the applicant can retry.
export async function submitApplication(token: string, sub: ApplicantSubmission) {
  const invite = await checkInvite(token)
  if (!invite.ok) return { error: `This link is no longer valid (${invite.reason}).`, id: null }

  const db = admin()
  const { experience, ...applicant } = sub
  const { data, error } = await db
    .from('applicants')
    .insert({ ...applicant, invite_token: token })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }

  const applicantId = data.id as string

  if (experience.length > 0) {
    const rows = experience.map((e, i) => ({ ...e, applicant_id: applicantId, sort_order: i }))
    const { error: expError } = await db.from('applicant_experience').insert(rows)
    if (expError) {
      // Roll back the parent by hand — the cascade on applicant_experience means this
      // clears any partially-written rows too, leaving the invite still usable.
      await db.from('applicants').delete().eq('id', applicantId)
      return { error: expError.message, id: null }
    }
  }

  await db.from('applicant_invites').update({ used_at: new Date().toISOString() }).eq('token', token)
  return { error: null, id: applicantId }
}

export async function listApplicants() {
  const { data } = await admin()
    .from('applicants')
    .select('*')
    .order('submitted_at', { ascending: false })
  return data ?? []
}

// Experience for many applicants in one request, grouped by applicant_id — avoids a query
// per row on the admin list (same batching approach as getAttendanceLogsForEmployees).
export async function getApplicantExperienceFor(applicantIds: string[]) {
  if (applicantIds.length === 0) return {}
  const { data } = await admin()
    .from('applicant_experience')
    .select('*')
    .in('applicant_id', applicantIds)
    .order('sort_order', { ascending: true })

  const byApplicant: Record<string, unknown[]> = {}
  for (const row of (data ?? []) as { applicant_id: string }[]) {
    ;(byApplicant[row.applicant_id] ??= []).push(row)
  }
  return byApplicant
}

export async function getApplicant(id: string) {
  const db = admin()
  const { data: applicant } = await db.from('applicants').select('*').eq('id', id).maybeSingle()
  if (!applicant) return null
  const { data: experience } = await db
    .from('applicant_experience')
    .select('*')
    .eq('applicant_id', id)
    .order('sort_order', { ascending: true })
  return { applicant, experience: experience ?? [] }
}

export async function setApplicantStatus(id: string, status: ApplicantStatus) {
  const { error } = await admin().from('applicants').update({ status }).eq('id', id)
  return { error: error?.message ?? null }
}
