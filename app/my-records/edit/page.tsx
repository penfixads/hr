import PenfixHeader from '@/components/PenfixHeader'
import PenfixFooter from '@/components/PenfixFooter'
import EmployeeEditForm from '@/components/EmployeeEditForm'
import SkillsSelfRatingEditor from '@/components/SkillsSelfRatingEditor'
import { getCurrentEmployee } from '@/lib/employee-session'
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: 'Edit My Info — Penfix',
}

export default async function EditMyRecordPage() {
  const employee = await getCurrentEmployee()

  if (!employee?.id) {
    return (
      <div className="flex flex-col min-h-screen">
        <PenfixHeader subtitle="Edit My Info" />
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center text-gray-500">
          No HR record found for your account yet — contact HR if you believe this is a mistake.
        </main>
        <PenfixFooter />
      </div>
    )
  }

  const { data } = await supabase
    .from('employees')
    .select('nickname, date_of_birth, position, address, mobile, telephone, email, sss_number, pagibig_number, philhealth_number, emergency_name, emergency_relationship, emergency_mobile, emergency_alt, team, skills_self_rating')
    .eq('id', employee.id)
    .single()

  const record = data as {
    nickname: string | null
    date_of_birth: string | null
    position: string | null
    address: string | null
    mobile: string | null
    telephone: string | null
    email: string | null
    sss_number: string | null
    pagibig_number: string | null
    philhealth_number: string | null
    emergency_name: string | null
    emergency_relationship: string | null
    emergency_mobile: string | null
    emergency_alt: string | null
    team: string | null
    skills_self_rating: Record<string, number> | null
  } | null

  return (
    <div className="flex flex-col min-h-screen">
      <PenfixHeader subtitle="Edit My Info" />
      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4A0000' }}>{employee.full_name}&apos;s Info</h2>
        <p className="text-sm text-gray-500 mb-6">
          Update your contact details, government numbers, or emergency contact. To change your team or full name, contact HR directly.
        </p>
        <EmployeeEditForm
          employeeId={employee.id}
          initial={{
            nickname: record?.nickname ?? '',
            date_of_birth: record?.date_of_birth ?? '',
            position: record?.position ?? '',
            address: record?.address ?? '',
            mobile: record?.mobile ?? '',
            telephone: record?.telephone ?? '',
            email: record?.email ?? '',
            sss_number: record?.sss_number ?? '',
            pagibig_number: record?.pagibig_number ?? '',
            philhealth_number: record?.philhealth_number ?? '',
            emergency_name: record?.emergency_name ?? '',
            emergency_relationship: record?.emergency_relationship ?? '',
            emergency_mobile: record?.emergency_mobile ?? '',
            emergency_alt: record?.emergency_alt ?? '',
          }}
        />

        <div className="mt-6">
          <SkillsSelfRatingEditor
            employeeId={employee.id}
            team={record?.team ?? 'creative'}
            initial={record?.skills_self_rating ?? {}}
          />
        </div>
      </main>
      <PenfixFooter />
    </div>
  )
}
