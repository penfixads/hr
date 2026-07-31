import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'

type MenuItem = {
  href: string
  icon: string
  title: string
  description: string
}

const FORMS: MenuItem[] = [
  { href: '/cash-advance', icon: '💵', title: 'Cash Advance', description: 'Request a cash advance.' },
  { href: '/overtime', icon: '⏱️', title: 'Overtime', description: 'File overtime worked.' },
  { href: '/leave', icon: '🌴', title: 'Leave', description: 'File sick or vacation leave.' },
  { href: '/undertime', icon: '⏳', title: 'Undertime', description: 'File a late login or early logout.' },
]

const OTHER: MenuItem[] = [
  { href: '/evaluate', icon: '⭐', title: 'Quarterly Self-Evaluation', description: 'Submit your 15-point quarterly self-evaluation.' },
]

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col gap-2 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:border-transparent hover:-translate-y-0.5"
    >
      <span className="text-3xl">{item.icon}</span>
      <span className="text-lg font-bold" style={{ color: '#4A0000' }}>{item.title}</span>
      <span className="text-sm text-gray-500">{item.description}</span>
    </Link>
  )
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Employee Portal" />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ color: '#4A0000' }}>Welcome</h2>
            <p className="text-gray-600 text-lg">Pick what you'd like to do.</p>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Forms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {FORMS.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Evaluation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {OTHER.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">New Here?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <Link
              href="/creative"
              className="group flex flex-col gap-2 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:border-transparent hover:-translate-y-0.5"
            >
              <span className="text-3xl">🎨</span>
              <span className="text-lg font-bold" style={{ color: '#4A0000' }}>Creative Team Onboarding</span>
              <span className="text-sm text-gray-500">Fill up your employee profile and skills self-assessment.</span>
            </Link>
            <Link
              href="/production"
              className="group flex flex-col gap-2 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:border-transparent hover:-translate-y-0.5"
            >
              <span className="text-3xl">🔧</span>
              <span className="text-lg font-bold" style={{ color: '#4A0000' }}>Production Team Onboarding</span>
              <span className="text-sm text-gray-500">Fill up your employee profile and skills self-assessment.</span>
            </Link>
          </div>

          <div className="text-center pt-6 border-t border-gray-200">
            <Link href="/admin" className="text-sm font-semibold hover:underline" style={{ color: '#4A0000' }}>
              Admin Dashboard →
            </Link>
          </div>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
