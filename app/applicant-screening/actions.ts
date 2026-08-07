'use server'

import { submitApplication } from '@/lib/applicants-server'
import {
  TEAMS, SALARY_BASES, EXPERIENCE_TYPES,
  type ApplicantSubmission, type ExperienceEntry, type Team, type SalaryBasis, type ExperienceType,
} from '@/lib/applicants'

export type SubmitResult = { ok: true } | { ok: false; error: string }

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: FormDataEntryValue | null) => {
  const s = str(v)
  if (s === null) return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// Public, unauthenticated action — the invite token is the entire trust boundary, so every
// field is re-validated here rather than trusted from the browser. submitApplication()
// re-checks the token itself before writing anything.
export async function submitScreening(formData: FormData): Promise<SubmitResult> {
  const token = str(formData.get('token'))
  if (!token) return { ok: false, error: 'Missing invite token.' }

  const full_name = str(formData.get('full_name'))
  const mobile = str(formData.get('mobile'))
  const email = str(formData.get('email'))
  const city = str(formData.get('city'))
  const position_applied = str(formData.get('position_applied'))
  const team = str(formData.get('team'))
  const basis = str(formData.get('expected_salary_basis'))
  const min = num(formData.get('expected_salary_min'))
  const max = num(formData.get('expected_salary_max'))

  if (!full_name || !mobile || !email || !city || !position_applied) {
    return { ok: false, error: 'Please fill in all required fields.' }
  }
  if (!email.includes('@')) return { ok: false, error: 'Please enter a valid email address.' }
  if (!team || !(TEAMS as readonly string[]).includes(team)) {
    return { ok: false, error: 'Please choose which team you are applying for.' }
  }
  if (!basis || !(SALARY_BASES as readonly string[]).includes(basis)) {
    return { ok: false, error: 'Please choose whether your expected salary is monthly or daily.' }
  }
  if (min === null || max === null || min < 0 || max < 0) {
    return { ok: false, error: 'Please enter your expected salary range.' }
  }
  if (max < min) return { ok: false, error: 'Expected salary maximum cannot be lower than the minimum.' }

  let experience: ExperienceEntry[] = []
  try {
    const raw = JSON.parse(str(formData.get('experience')) ?? '[]')
    if (!Array.isArray(raw)) throw new Error('not an array')
    experience = raw
      // Blank rows are expected: the form starts with one empty entry, and an applicant
      // with no work history should still be able to submit.
      .filter((e) => typeof e?.company === 'string' && e.company.trim() && String(e.position ?? '').trim())
      .map((e): ExperienceEntry => ({
        experience_type: (EXPERIENCE_TYPES as readonly string[]).includes(e.experience_type)
          ? (e.experience_type as ExperienceType)
          : 'Employment',
        company: String(e.company).trim(),
        position: String(e.position).trim(),
        start_date: e.start_date || null,
        end_date: e.is_current ? null : e.end_date || null,
        is_current: Boolean(e.is_current),
        salary_rate: Number.isFinite(Number(e.salary_rate)) && e.salary_rate !== null ? Number(e.salary_rate) : null,
        salary_basis: (SALARY_BASES as readonly string[]).includes(e.salary_basis)
          ? (e.salary_basis as SalaryBasis)
          : null,
        reason_for_leaving: e.reason_for_leaving ? String(e.reason_for_leaving).trim() : null,
      }))
  } catch {
    return { ok: false, error: 'Could not read your work history. Please try again.' }
  }

  const submission: ApplicantSubmission = {
    full_name,
    nickname: str(formData.get('nickname')),
    date_of_birth: str(formData.get('date_of_birth')),
    mobile,
    email,
    city,
    position_applied,
    team: team as Team,
    expected_salary_min: min,
    expected_salary_max: max,
    expected_salary_basis: basis as SalaryBasis,
    earliest_start_date: str(formData.get('earliest_start_date')),
    heard_about_us: str(formData.get('heard_about_us')),
    skills: (str(formData.get('skills')) ?? '').split(',').map(s => s.trim()).filter(Boolean),
    software: formData.getAll('software').map(String).filter(Boolean),
    years_experience: num(formData.get('years_experience')),
    highest_education: str(formData.get('highest_education')),
    school: str(formData.get('school')),
    course: str(formData.get('course')),
    year_graduated: num(formData.get('year_graduated')),
    expectations: str(formData.get('expectations')),
    portfolio_url: str(formData.get('portfolio_url')),
    notes: str(formData.get('notes')),
    experience,
  }

  const { error } = await submitApplication(token, submission)
  if (error) return { ok: false, error }
  return { ok: true }
}
