import Link from 'next/link'
import { headers } from 'next/headers'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { listApplicants, listInvites, getApplicantExperienceFor } from '@/lib/applicants-server'
import ApplicantsClient from './ApplicantsClient'

export const metadata = { title: 'Applicant Screening — Penfix HR' }

// Admin-gated by middleware.ts (/admin/*). Reads go through the service-role client since
// the applicant tables deny anon and authenticated outright — see the header comment in
// supabase/CATCHUP_applicant_screening.sql.
export const dynamic = 'force-dynamic'

export default async function AdminApplicantsPage() {
  const [applicants, invites] = await Promise.all([listApplicants(), listInvites()])

  // Experience rows for every applicant in one query, grouped in memory — one request
  // instead of N, same pattern as getAttendanceLogsForEmployees().
  const experienceByApplicant = await getApplicantExperienceFor(
    applicants.map((a: { id: string }) => a.id)
  )

  const h = await headers()
  const host = h.get('host') ?? 'hr.penfixads.com'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Applicant Screening" />
      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#4A0000' }}>Applicant Screening</h2>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
        </div>

        <ApplicantsClient
          applicants={applicants as never[]}
          experienceByApplicant={experienceByApplicant as never}
          invites={invites as never[]}
          origin={`${proto}://${host}`}
        />
      </main>
      <PenfixFooter />
    </div>
  )
}
