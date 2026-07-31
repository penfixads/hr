import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import CashAdvanceForm from '@/components/CashAdvanceForm'

export const metadata = {
  title: 'Cash Advance Request — Penfix',
}

export default function CashAdvancePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Cash Advance Request" />
      <main className="flex-1 px-4 py-10">
        <CashAdvanceForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
