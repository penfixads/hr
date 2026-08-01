import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import LoanForm from '@/components/LoanForm'

export const metadata = {
  title: 'Loan Request — Penfix',
}

export default function LoanPage() {
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
