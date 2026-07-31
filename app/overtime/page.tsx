import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import OvertimeForm from '@/components/OvertimeForm'

export const metadata = {
  title: 'Overtime Form — Penfix',
}

export default function OvertimePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Overtime Form" />
      <main className="flex-1 px-4 py-10">
        <OvertimeForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
