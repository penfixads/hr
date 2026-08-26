import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import LateExcuseForm from '@/components/LateExcuseForm'

export const metadata = {
  title: 'Late Excuse Form — Penfix',
}

export default function LateExcusePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Late Excuse Form" />
      <main className="flex-1 px-4 py-10">
        <LateExcuseForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
