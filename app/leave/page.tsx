import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import LeaveForm from '@/components/LeaveForm'

export const metadata = {
  title: 'Leave Form — Penfix',
}

export default function LeavePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Leave Form" />
      <main className="flex-1 px-4 py-10">
        <LeaveForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
