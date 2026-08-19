import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import ApplicantAssessmentForm from '@/components/ApplicantAssessmentForm'
import { checkAssessmentInvite } from '@/lib/assessment-server'

export const metadata = {
  title: 'Applicant Assessment — Penfix',
}

// Public: reachable without a login (see the bypass in middleware.ts). The token in the URL
// is the only credential — validated here on render and again inside submitAssessmentAction(),
// so a stale tab cannot post against a consumed invite. The role comes from the invite, never
// from the applicant, so nobody can pick the shorter module.
export const dynamic = 'force-dynamic'

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md mx-auto bg-penfix-card rounded-xl border shadow-sm p-10 text-center">
      <h2 className="text-lg font-bold mb-2" style={{ color: '#D9BB6E' }}>{title}</h2>
      <p className="text-penfix-text-muted text-sm">{body}</p>
    </div>
  )
}

export default async function ApplicantAssessmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await checkAssessmentInvite(token)

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Applicant Assessment" />
      <main className="flex-1 px-4 py-10">
        {invite.ok ? (
          <ApplicantAssessmentForm token={token} label={invite.label} role={invite.role} />
        ) : invite.reason === 'used' ? (
          <Notice
            title="This assessment has already been submitted"
            body="Our records show this link was already used. If you think this is a mistake, please contact Penfix HR."
          />
        ) : invite.reason === 'expired' ? (
          <Notice
            title="This link has expired"
            body="Please ask Penfix HR to send you a new assessment link."
          />
        ) : (
          <Notice
            title="Link not found"
            body="This assessment link isn't valid. Please check the link you were sent, or contact Penfix HR."
          />
        )}
      </main>
      <PenfixFooter />
    </div>
  )
}
