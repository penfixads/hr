import Link from 'next/link'
import { headers } from 'next/headers'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { listAssessments, listAssessmentInvites } from '@/lib/assessment-server'
import AssessmentsClient from './AssessmentsClient'

export const metadata = { title: 'Applicant Assessments — Penfix HR' }

// Admin-gated by middleware.ts (/admin/*). Reads go through the service-role client since
// applicant_assessments denies anon and authenticated outright — see the header comment in
// supabase/CATCHUP_applicant_assessment.sql.
export const dynamic = 'force-dynamic'

export default async function AdminAssessmentsPage() {
  const [assessments, invites] = await Promise.all([listAssessments(), listAssessmentInvites()])

  const h = await headers()
  const host = h.get('host') ?? 'hr.penfixads.com'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Applicant Assessments" />
      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#D9BB6E' }}>Applicant Assessments</h2>
          <div className="flex gap-4">
            <Link href="/admin/applicants" className="text-sm hover:underline" style={{ color: '#D9BB6E' }}>
              Screening forms
            </Link>
            <Link href="/admin" className="text-sm hover:underline" style={{ color: '#D9BB6E' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <AssessmentsClient
          assessments={assessments as never[]}
          invites={invites as never[]}
          origin={`${proto}://${host}`}
        />
      </main>
      <PenfixFooter />
    </div>
  )
}
