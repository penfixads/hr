import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getRequestsOverviewForPeriod } from '@/lib/employee-records'
import { getCurrentPayPeriod } from '@/lib/payday'
import RequestsOverviewClient from '@/components/RequestsOverviewClient'

// No dynamic route segment, so without this Next would try to statically prerender at
// build time instead of querying per-visitor — same reasoning as app/admin/attendance/page.tsx.
export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  const payPeriod = getCurrentPayPeriod()
  const entries = await getRequestsOverviewForPeriod(payPeriod.start, payPeriod.end, payPeriod.payday)

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle={`Requests — ${payPeriod.label}`} />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#4A0000' }}>Requests — {payPeriod.label}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cash Advance &amp; Loan: Pending or resolved this period. Overtime &amp; Leave: filed for a date in this period.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/history" className="text-sm hover:underline" style={{ color: '#4A0000' }}>Full History →</Link>
            <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
          </div>
        </div>

        <RequestsOverviewClient entries={entries} />
      </main>

      <PenfixFooter />
    </div>
  )
}
