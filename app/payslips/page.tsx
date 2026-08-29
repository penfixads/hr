import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getCurrentEmployee } from '@/lib/employee-session'
import { getMyPayslips } from '@/lib/payslips'
import { formatDateRangeLabel } from '@/lib/payslip-format'

export const metadata = {
  title: 'Payslips — Penfix',
}

// Payslips are generated in the payroll app and only reach this list once payroll clicks
// "Send to myHR" on them (sets payslips.sent_to_myhr = true). Always dynamic — reads the
// SSO session and the shared payroll tables per request.
export const dynamic = 'force-dynamic'

const peso = (n: number) => `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function PayslipsPage() {
  const employee = await getCurrentEmployee()

  if (!employee?.id && !employee?.isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader subtitle="Payslips" />
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center pf-text-muted">
          No HR record found for your account yet — contact HR if you believe this is a mistake.
        </main>
        <PenfixFooter />
      </div>
    )
  }

  const payslips = await getMyPayslips()

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Payslips" />
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground mb-2">My Payslips</h2>
        <p className="pf-text-muted text-sm mb-6">
          Payslips appear here once payroll releases them. Each one opens as a printable document.
        </p>

        {payslips.length === 0 ? (
          <div className="pf-card rounded-2xl px-6 py-10 text-center pf-text-muted">
            You have no released payslips yet. When payroll sends one to your MyHR, it will show up here.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {payslips.map(p => (
              <li key={p.id}>
                <Link
                  href={`/payslips/${p.id}`}
                  className="pf-card group flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold"
                >
                  <div>
                    <div className="font-bold text-foreground">
                      {formatDateRangeLabel(p.periodStart, p.periodEnd) || 'Pay period'}
                    </div>
                    <div className="text-xs pf-text-muted mt-0.5">
                      {p.sentAt ? `Released ${new Date(p.sentAt).toLocaleDateString()}` : 'Released'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: '#D9BB6E' }}>{peso(p.netPay)}</div>
                    <div className="text-xs pf-text-muted">Net pay</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <PenfixFooter />
    </div>
  )
}
