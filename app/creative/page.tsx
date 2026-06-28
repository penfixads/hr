import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import EmployeeForm from '@/components/EmployeeForm'
import { CREATIVE_SKILLS } from '@/lib/skills'

export const metadata = {
  title: 'Creative Team Form — Penfix Skills Assessment',
}

export default function CreativePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Creative Team — Skills Assessment Form" />
      <main className="flex-1 px-4 py-10">
        <EmployeeForm team="creative" skills={CREATIVE_SKILLS} />
      </main>
      <PenfixFooter />
    </div>
  )
}
