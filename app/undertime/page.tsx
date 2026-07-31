import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import UndertimeForm from '@/components/UndertimeForm'

export const metadata = {
  title: 'Undertime Form — Penfix',
}

export default function UndertimePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Undertime Form" />
      <main className="flex-1 px-4 py-10">
        <UndertimeForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
