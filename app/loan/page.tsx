import { redirect } from 'next/navigation'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import LoanForm from '@/components/LoanForm'
import { getCurrentEmployee } from '@/lib/employee-session'

export const metadata = {
  title: 'Loan Request — Penfix',
}

export default async function LoanPage() {
  const employee = await getCurrentEmployee()
  if (employee?.employment_status !== 'Regular') {
    redirect('/?error=regular-only')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Loan Request" />
      <main className="flex-1 px-4 py-10">
        <LoanForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
