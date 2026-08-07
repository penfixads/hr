import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import ApplicantScreeningForm from '@/components/ApplicantScreeningForm'
import { checkInvite } from '@/lib/applicants-server'

export const metadata = {
  title: 'Applicant Screening — Penfix',
}

// Public: reachable without a login (see the bypass in middleware.ts). The token in the
// URL is the only credential — it is validated here on render and again inside
// submitApplication(), so a stale tab cannot post against a consumed invite.
export const dynamic = 'force-dynamic'

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border shadow-sm p-10 text-center">
      <h2 className="text-lg font-bold mb-2" style={{ color: '#4A0000' }}>{title}</h2>
      <p className="text-gray-600 text-sm">{body}</p>
    </div>
  )
}

export default async function ApplicantScreeningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await checkInvite(token)

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Applicant Screening" />
      <main className="flex-1 px-4 py-10">
        {invite.ok ? (
          <ApplicantScreeningForm token={token} label={invite.label} />
        ) : invite.reason === 'used' ? (
          <Notice
            title="This form has already been submitted"
            body="Our records show this link was already used. If you think this is a mistake, please contact Penfix HR."
          />
        ) : invite.reason === 'expired' ? (
          <Notice
            title="This link has expired"
            body="Please ask Penfix HR to send you a new screening link."
          />
        ) : (
          <Notice
            title="Link not found"
            body="This screening link isn't valid. Please check the link you were sent, or contact Penfix HR."
          />
        )}
      </main>
      <PenfixFooter />
    </div>
  )
}
