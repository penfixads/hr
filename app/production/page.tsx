import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import EmployeeForm from '@/components/EmployeeForm'
import { PRODUCTION_SKILLS } from '@/lib/skills'

export const metadata = {
  title: 'Production Team Form — Penfix Skills Assessment',
}

export default function ProductionPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Production Team — Skills Assessment Form" />
      <main className="flex-1 px-4 py-10">
        <EmployeeForm team="production" skills={PRODUCTION_SKILLS} />
      </main>
      <PenfixFooter />
    </div>
  )
}
