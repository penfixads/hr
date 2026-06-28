import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3" style={{ color: '#4A0000' }}>
              Employee Skills Assessment
            </h2>
            <p className="text-gray-600 text-lg">
              Welcome! Please select your team to begin filling up your employee profile and skills self-assessment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 w-full">
            <Link
              href="/creative"
              className="group flex flex-col items-center gap-3 px-10 py-8 rounded-2xl shadow-lg text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl flex-1"
              style={{ backgroundColor: '#4A0000' }}
            >
              <span className="text-4xl">🎨</span>
              <span>I&apos;m from the</span>
              <span style={{ color: '#C9A84C' }} className="text-xl font-bold">Creative Team</span>
            </Link>

            <Link
              href="/production"
              className="group flex flex-col items-center gap-3 px-10 py-8 rounded-2xl shadow-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl border-2 flex-1"
              style={{ backgroundColor: '#C9A84C', borderColor: '#4A0000', color: '#4A0000' }}
            >
              <span className="text-4xl">🔧</span>
              <span>I&apos;m from the</span>
              <span className="text-xl font-bold" style={{ color: '#4A0000' }}>Production Team</span>
            </Link>
          </div>

          <p className="mt-10 text-sm text-gray-500">
            No login required — just open the link and fill up your form.
          </p>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
