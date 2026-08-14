import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getAllRequestsHistory } from '@/lib/employee-records'
import RequestsHistoryClient from '@/components/RequestsHistoryClient'

// Same reasoning as app/admin/requests/page.tsx and app/admin/attendance/page.tsx — no
// dynamic route segment, so force per-visitor querying instead of a build-time prerender.
export const dynamic = 'force-dynamic'

export default async function AdminHistoryPage() {
  const history = await getAllRequestsHistory()

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Request History — All Employees" />

      <main className="flex-1 px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#4A0000' }}>Request History</h2>
            <p className="text-sm text-gray-500 mt-1">
              Every Loan, Cash Advance, Overtime, Undertime, and Leave filing — all employees, no pay-period limit.
            </p>
          </div>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#4A0000' }}>← Back to Dashboard</Link>
        </div>

        <RequestsHistoryClient history={history} />
      </main>

      <PenfixFooter />
    </div>
  )
}
