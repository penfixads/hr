import Link from 'next/link'
import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import { getCurrentEmployee } from '@/lib/employee-session'

type MenuItem = {
  href: string
  icon: string
  title: string
  description: string
}

const MY_RECORDS: MenuItem[] = [
  { href: '/my-records', icon: '📋', title: 'MyHR', description: 'View your attendance, requests, and evaluation history.' },
]

const ADMIN_DASHBOARD: MenuItem[] = [
  { href: '/admin', icon: '🛠️', title: 'Admin Dashboard', description: 'Manage employees, records, and requests.' },
  { href: '/admin/assess', icon: '⭐', title: 'Skills Assessment', description: 'Rate employee skills, one at a time, for raise consideration.' },
  { href: '/admin/attendance', icon: '🕒', title: 'Attendance', description: 'View punch records for every employee this pay period.' },
  { href: '/admin/requests', icon: '📥', title: 'Requests', description: 'See who filed a Cash Advance, Loan, Overtime, or Leave request this pay period.' },
]

const ADMIN_APPLICANTS: MenuItem[] = [
  { href: '/admin/applicants', icon: '📄', title: 'Applicant Screening', description: 'Send screening links to applicants and review their biodata.' },
  { href: '/admin/assessments', icon: '🧠', title: 'Applicant Assessment', description: 'Send the assessment exam, then review scores and essays.' },
]

const FORMS: MenuItem[] = [
  { href: '/cash-advance', icon: '💵', title: 'Cash Advance', description: 'Request a cash advance.' },
  { href: '/loan', icon: '🏦', title: 'Loan', description: 'Request a regular loan, paid in installments.' },
  { href: '/overtime', icon: '⏱️', title: 'Overtime', description: 'File overtime worked.' },
  { href: '/leave', icon: '🌴', title: 'Leave', description: 'File sick or vacation leave.' },
  { href: '/undertime', icon: '⏳', title: 'Undertime', description: 'File a late login or early logout.' },
]

const OTHER: MenuItem[] = [
  { href: '/evaluate', icon: '⭐', title: 'Quarterly Self-Evaluation', description: 'Submit your 15-point quarterly self-evaluation.' },
]

const ONBOARDING: MenuItem[] = [
  { href: '/creative', icon: '🎨', title: 'Creative Team Onboarding', description: 'Fill up your employee profile and skills self-assessment.' },
  { href: '/production', icon: '🔧', title: 'Production Team Onboarding', description: 'Fill up your employee profile and skills self-assessment.' },
]

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <Link
      href={item.href}
      className="pf-card group relative flex flex-col gap-2 p-6 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold"
    >
      <span
        className="absolute inset-x-0 top-0 h-1 bg-penfix-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"
        aria-hidden
      />
      <span className="text-3xl">{item.icon}</span>
      <span className="text-lg font-bold text-penfix-gold-light">{item.title}</span>
      <span className="text-sm pf-text-muted">{item.description}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-penfix-gold mb-3">
      {children}
    </h3>
  )
}

export default async function Home() {
  const employee = await getCurrentEmployee()
  // Forms are self-service filing pages ("request a cash advance for yourself") — an
  // Admin reviewing everyone else's filings isn't the one filling these out, so they get
  // the Requests overview tile above instead, not the forms themselves (see ADMIN_DASHBOARD).
  // Loan is further gated to Regular employees — Trainees and Probationary hires don't
  // yet qualify for the payday-installment loan program.
  const forms = employee?.isAdmin
    ? []
    : employee?.employment_status === 'Regular'
      ? FORMS
      : FORMS.filter(item => item.href !== '/loan')
  const myRecords = employee?.isAdmin ? ADMIN_DASHBOARD : MY_RECORDS
  // full_name falls back to the login email when there's no matching employee row
  // (see lib/employee-session.ts) — skip the greeting name rather than show an email.
  const firstName = employee?.full_name && !employee.full_name.includes('@')
    ? employee.full_name.split(' ')[0]
    : ''

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Employee Portal" />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-penfix-gold-light">
              Welcome Back{firstName ? `, ${firstName}` : ''}!
            </h2>
            <p className="pf-text-muted text-lg">What records would you like to look at today?</p>
          </div>

          <SectionLabel>{employee?.isAdmin ? 'Admin' : 'MyHR'}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {myRecords.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          {employee?.isAdmin && (
            <>
              <SectionLabel>Applicants</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {ADMIN_APPLICANTS.map(item => <MenuCard key={item.href} item={item} />)}
              </div>
            </>
          )}

          {forms.length > 0 && (
            <>
              <SectionLabel>Forms</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {forms.map(item => <MenuCard key={item.href} item={item} />)}
              </div>
            </>
          )}

          <SectionLabel>Evaluation</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {OTHER.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          <SectionLabel>New Here?</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {ONBOARDING.map(item => <MenuCard key={item.href} item={item} />)}
          </div>

          <div className="text-center pt-6" style={{ borderTop: '1px solid var(--penfix-border)' }}>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-penfix-gold-light transition-colors hover:text-penfix-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-penfix-gold rounded"
            >
              Admin Dashboard <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>

      <PenfixFooter />
    </div>
  )
}
