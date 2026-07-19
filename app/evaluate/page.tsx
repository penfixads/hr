import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import QuarterlyEvaluationForm from '@/components/QuarterlyEvaluationForm'

export const metadata = {
  title: 'Quarterly Self-Evaluation — Penfix',
}

export default function EvaluatePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="15-Point Quarterly Self-Evaluation" />
      <main className="flex-1 px-4 py-10">
        <QuarterlyEvaluationForm />
      </main>
      <PenfixFooter />
    </div>
  )
}
