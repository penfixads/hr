// Shared types + option lists for applicant screening. No "next/headers" or service-role
// import here, so the public form component can import it into the browser bundle safely
// (same split as lib/attendance-shared.ts vs lib/attendance.ts).

export const TEAMS = ['creative', 'production'] as const
export type Team = (typeof TEAMS)[number]

export const SALARY_BASES = ['Monthly', 'Daily'] as const
export type SalaryBasis = (typeof SALARY_BASES)[number]

export const EXPERIENCE_TYPES = ['Employment', 'Freelance', 'Internship/OJT'] as const
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number]

export const APPLICANT_STATUSES = ['New', 'Shortlisted', 'Rejected', 'Hired'] as const
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number]

export const EDUCATION_LEVELS = [
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational / TESDA',
  'College Undergraduate',
  'College Graduate',
  "Master's Degree",
] as const

// Deliberately NOT reusing CREATIVE_SKILLS / PRODUCTION_SKILLS from lib/skills.ts: those
// are appraisal statements written to be rated 1-5 on staff ("Ability to create layouts
// using Adobe Photoshop"), far too long and too internal to put in front of an applicant.
// This is a short, screening-appropriate list of the tools actually used in the shop.
export const SOFTWARE_OPTIONS = [
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Adobe InDesign',
  'Adobe Premiere Pro',
  'Adobe After Effects',
  'CorelDRAW',
  'Canva',
  'Figma',
  'AutoCAD',
  'SketchUp',
  'Blender / 3D',
  'Microsoft Excel',
  'Microsoft Word',
  'Google Workspace',
  'Capcut',
  'Large-format printer RIP software',
] as const

export type ExperienceEntry = {
  experience_type: ExperienceType
  company: string
  position: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  salary_rate: number | null
  salary_basis: SalaryBasis | null
  reason_for_leaving: string | null
}

export type ApplicantSubmission = {
  full_name: string
  nickname: string | null
  date_of_birth: string | null
  mobile: string
  email: string
  city: string
  position_applied: string
  team: Team
  expected_salary_min: number
  expected_salary_max: number
  expected_salary_basis: SalaryBasis
  earliest_start_date: string | null
  heard_about_us: string | null
  skills: string[]
  software: string[]
  years_experience: number | null
  highest_education: string | null
  school: string | null
  course: string | null
  year_graduated: number | null
  expectations: string | null
  portfolio_url: string | null
  notes: string | null
  experience: ExperienceEntry[]
}

export function emptyExperience(): ExperienceEntry {
  return {
    experience_type: 'Employment',
    company: '',
    position: '',
    start_date: null,
    end_date: null,
    is_current: false,
    salary_rate: null,
    salary_basis: 'Monthly',
    reason_for_leaving: null,
  }
}

export function formatSalaryRange(min: number, max: number, basis: string): string {
  const f = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
  return min === max ? `${f(min)} / ${basis}` : `${f(min)} – ${f(max)} / ${basis}`
}
