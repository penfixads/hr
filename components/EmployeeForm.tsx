'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import StarRating from './StarRating'
import type { SkillsMap } from '@/lib/skills'

interface EmployeeFormProps {
  team: 'creative' | 'production'
  skills: SkillsMap
}

interface PersonalInfo {
  full_name: string
  employee_number: string
  nickname: string
  date_of_birth: string
  position: string
  department: string
  employment_status: string
  date_joined: string
  address: string
  mobile: string
  telephone: string
  email: string
}

interface GovNumbers {
  sss_number: string
  pagibig_number: string
  philhealth_number: string
}

interface EmergencyContact {
  emergency_name: string
  emergency_relationship: string
  emergency_mobile: string
  emergency_alt: string
}

const STEPS = ['Personal Information', 'Gov\'t Numbers & Emergency Contact', 'Skills Self-Assessment', 'Review & Submit']

export default function EmployeeForm({ team, skills }: EmployeeFormProps) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [personal, setPersonal] = useState<PersonalInfo>({
    full_name: '', employee_number: '', nickname: '', date_of_birth: '',
    position: '', department: team === 'creative' ? 'Creative Team' : 'Production Team',
    employment_status: '', date_joined: '', address: '', mobile: '', telephone: '', email: '',
  })

  const [gov, setGov] = useState<GovNumbers>({
    sss_number: '', pagibig_number: '', philhealth_number: '',
  })

  const [emergency, setEmergency] = useState<EmergencyContact>({
    emergency_name: '', emergency_relationship: '', emergency_mobile: '', emergency_alt: '',
  })

  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    Object.values(skills).flat().forEach(skill => { init[skill] = 0 })
    return init
  })

  const setRating = (skill: string, val: number) => {
    setRatings(prev => ({ ...prev, [skill]: val }))
  }

  const validateStep = () => {
    if (step === 0) {
      if (!personal.full_name || !personal.employee_number || !personal.position ||
          !personal.employment_status || !personal.address || !personal.mobile || !personal.email) {
        setError('Please fill in all required fields.')
        return false
      }
    }
    if (step === 1) {
      if (!emergency.emergency_name || !emergency.emergency_relationship || !emergency.emergency_mobile) {
        setError('Please fill in all required emergency contact fields.')
        return false
      }
    }
    setError('')
    return true
  }

  const next = () => {
    if (validateStep()) setStep(s => s + 1)
  }
  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...personal,
        ...gov,
        ...emergency,
        team,
        skills_self_rating: ratings,
        submitted_at: new Date().toISOString(),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: sbErr } = await (supabase as any).from('employees').insert([payload])
      if (sbErr) throw sbErr
      setSubmitted(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#4A0000' }}>Submitted Successfully!</h2>
        <p className="text-gray-600 text-lg max-w-md">
          Thank you! Your profile has been submitted successfully. Boss Allen will review your assessment soon.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"
  const requiredStar = <span className="text-red-500 ml-0.5">*</span>

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="font-medium" style={{ color: '#4A0000' }}>{STEPS[step]}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ backgroundColor: '#C9A84C', width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs ${i <= step ? 'font-semibold' : 'text-gray-400'}`}
              style={{ color: i <= step ? '#4A0000' : undefined }}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Step 0: Personal Information */}
      {step === 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Personal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name {requiredStar}</label>
              <input style={focusStyle} className={inputClass} value={personal.full_name}
                onChange={e => setPersonal(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Employee Number {requiredStar}</label>
              <input style={focusStyle} className={inputClass} value={personal.employee_number}
                onChange={e => setPersonal(p => ({ ...p, employee_number: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Nickname / Preferred Name</label>
              <input style={focusStyle} className={inputClass} value={personal.nickname}
                onChange={e => setPersonal(p => ({ ...p, nickname: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" style={focusStyle} className={inputClass} value={personal.date_of_birth}
                onChange={e => setPersonal(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Current Position / Role {requiredStar}</label>
              <input style={focusStyle} className={inputClass} value={personal.position}
                onChange={e => setPersonal(p => ({ ...p, position: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select style={focusStyle} className={inputClass} value={personal.department}
                onChange={e => setPersonal(p => ({ ...p, department: e.target.value }))}>
                <option>Creative Team</option>
                <option>Production Team</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Employment Status {requiredStar}</label>
              <select style={focusStyle} className={inputClass} value={personal.employment_status}
                onChange={e => setPersonal(p => ({ ...p, employment_status: e.target.value }))}>
                <option value="">Select...</option>
                <option>Trainee</option>
                <option>Probationary</option>
                <option>Regular</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Joined Penfix</label>
              <input type="date" style={focusStyle} className={inputClass} value={personal.date_joined}
                onChange={e => setPersonal(p => ({ ...p, date_joined: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Complete Home Address {requiredStar}</label>
            <textarea style={focusStyle} className={inputClass} rows={2} value={personal.address}
              onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mobile Number {requiredStar}</label>
              <input type="tel" style={focusStyle} className={inputClass} value={personal.mobile}
                onChange={e => setPersonal(p => ({ ...p, mobile: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Telephone / Landline</label>
              <input type="tel" style={focusStyle} className={inputClass} value={personal.telephone}
                onChange={e => setPersonal(p => ({ ...p, telephone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email Address {requiredStar}</label>
              <input type="email" style={focusStyle} className={inputClass} value={personal.email}
                onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Gov Numbers + Emergency */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Government Numbers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>SSS Number</label>
                <input style={focusStyle} className={inputClass} value={gov.sss_number}
                  onChange={e => setGov(g => ({ ...g, sss_number: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Pag-IBIG MID Number</label>
                <input style={focusStyle} className={inputClass} value={gov.pagibig_number}
                  onChange={e => setGov(g => ({ ...g, pagibig_number: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>PhilHealth Number</label>
                <input style={focusStyle} className={inputClass} value={gov.philhealth_number}
                  onChange={e => setGov(g => ({ ...g, philhealth_number: e.target.value }))} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Emergency Contact Name {requiredStar}</label>
                <input style={focusStyle} className={inputClass} value={emergency.emergency_name}
                  onChange={e => setEmergency(ec => ({ ...ec, emergency_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Relationship {requiredStar}</label>
                <input style={focusStyle} className={inputClass} value={emergency.emergency_relationship}
                  onChange={e => setEmergency(ec => ({ ...ec, emergency_relationship: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Emergency Mobile {requiredStar}</label>
                <input type="tel" style={focusStyle} className={inputClass} value={emergency.emergency_mobile}
                  onChange={e => setEmergency(ec => ({ ...ec, emergency_mobile: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Alternative Contact</label>
                <input type="tel" style={focusStyle} className={inputClass} value={emergency.emergency_alt}
                  onChange={e => setEmergency(ec => ({ ...ec, emergency_alt: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Skills */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#4A0000' }}>Skills Self-Assessment</h3>
          <p className="text-sm text-gray-500 mb-6">
            Rate yourself honestly: 1 = No knowledge · 2 = Basic · 3 = Intermediate · 4 = Advanced · 5 = Expert
          </p>
          {Object.entries(skills).map(([category, skillList]) => (
            <div key={category} className="mb-8">
              <h4 className="font-semibold text-base mb-3 pb-2 border-b-2" style={{ color: '#4A0000', borderColor: '#C9A84C' }}>
                {category}
              </h4>
              <div className="space-y-4">
                {(skillList as string[]).map((skill) => (
                  <div key={skill} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white rounded-lg border border-gray-100">
                    <span className="text-sm text-gray-700 flex-1">{skill}</span>
                    <StarRating value={ratings[skill] || 0} onChange={val => setRating(skill, val)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold" style={{ color: '#4A0000' }}>Review Your Submission</h3>

          <div className="bg-white rounded-xl border p-5 space-y-2">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Personal Information</h4>
            {[
              ['Full Name', personal.full_name],
              ['Employee Number', personal.employee_number],
              ['Nickname', personal.nickname],
              ['Date of Birth', personal.date_of_birth],
              ['Position', personal.position],
              ['Department', personal.department],
              ['Status', personal.employment_status],
              ['Date Joined', personal.date_joined],
              ['Address', personal.address],
              ['Mobile', personal.mobile],
              ['Email', personal.email],
            ].map(([label, val]) => val ? (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-gray-500 w-36 shrink-0">{label}:</span>
                <span className="text-gray-800 font-medium">{val}</span>
              </div>
            ) : null)}
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Skills Summary</h4>
            {Object.entries(skills).map(([category, skillList]) => {
              const rated = (skillList as string[]).filter(s => (ratings[s] || 0) > 0)
              const avg = rated.length ? (rated.reduce((sum, s) => sum + (ratings[s] || 0), 0) / rated.length).toFixed(1) : 'N/A'
              return (
                <div key={category} className="text-sm mb-2">
                  <span className="text-gray-700">{category}: </span>
                  <span className="font-semibold" style={{ color: '#4A0000' }}>{avg} avg</span>
                  <span className="text-gray-400 ml-2">({rated.length}/{(skillList as string[]).length} rated)</span>
                </div>
              )
            })}
          </div>

          <p className="text-sm text-gray-500 text-center">
            Please review your information before submitting. You cannot edit after submission.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
        {step > 0 ? (
          <button onClick={back} className="px-6 py-2 border-2 rounded-lg font-semibold text-sm transition-colors"
            style={{ borderColor: '#4A0000', color: '#4A0000' }}>
            ← Back
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button onClick={next} className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#4A0000' }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#C9A84C' }}>
            {loading ? 'Submitting...' : '✓ Submit Profile'}
          </button>
        )}
      </div>
    </div>
  )
}
