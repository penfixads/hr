'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import StarRating from './StarRating'
import { isBonusCategory, BONUS_CATEGORY_NOTE, type SkillsMap } from '@/lib/skills'

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

// Capitalizes the first letter of each word/hyphenated segment as the user types, without
// touching the rest of what they typed — so intentional interior caps (e.g. "McDonald") survive.
function toTitleCase(value: string) {
  return value.replace(/(^|[\s-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase())
}

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
      // Requires First Middle Last — a hyphenated surname (e.g. "Jacinto-Quiambao") still
      // counts as one part, so this just checks there are 3+ space-separated words.
      if (personal.full_name.trim().split(/\s+/).length < 3) {
        setError('Please enter your full name including a middle name, e.g. Maria Allen Jacinto-Quiambao.')
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
        // date_of_birth/date_joined are optional `date` columns — Postgres rejects an
        // empty string for a date type outright (not just "invalid null"), so an
        // untouched optional date field must be sent as null, not ''.
        date_of_birth: personal.date_of_birth || null,
        date_joined: personal.date_joined || null,
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
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#D9BB6E' }}>Submitted Successfully!</h2>
        <p className="text-penfix-text-muted text-lg max-w-md">
          Thank you! Your profile has been submitted successfully. Management will review your assessment soon.
        </p>
      </div>
    )
  }

  const inputClass = "w-full border border-penfix-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-foreground mb-1"
  const requiredStar = <span className="text-red-500 ml-0.5">*</span>

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={team === 'creative' ? '/images/myhricons/creative%20team%20onboarding.png' : '/images/myhricons/prod%20onboarding.png'}
          alt="" className="w-8 h-8 object-contain"
        />
        <h3 className="text-lg font-bold" style={{ color: '#D9BB6E' }}>
          {team === 'creative' ? 'Creative Team Onboarding' : 'Production Team Onboarding'}
        </h3>
      </div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-penfix-text-muted mb-2">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="font-medium" style={{ color: '#D9BB6E' }}>{STEPS[step]}</span>
        </div>
        <div className="h-2 bg-penfix-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ backgroundColor: '#C9A84C', width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs ${i <= step ? 'font-semibold' : 'text-penfix-text-muted'}`}
              style={{ color: i <= step ? '#D9BB6E' : undefined }}>
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
          <h3 className="text-lg font-bold mb-4" style={{ color: '#D9BB6E' }}>Personal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name {requiredStar}</label>
              <input style={focusStyle} className={inputClass} value={personal.full_name}
                placeholder="Ex. Maria Allen Jacinto-Quiambao"
                onChange={e => setPersonal(p => ({ ...p, full_name: toTitleCase(e.target.value) }))} />
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
            <h3 className="text-lg font-bold mb-4" style={{ color: '#D9BB6E' }}>Government Numbers</h3>
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
            <h3 className="text-lg font-bold mb-4" style={{ color: '#D9BB6E' }}>Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Emergency Contact Name {requiredStar}</label>
                <input style={focusStyle} className={inputClass} value={emergency.emergency_name}
                  onChange={e => setEmergency(ec => ({ ...ec, emergency_name: toTitleCase(e.target.value) }))} />
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
          <h3 className="text-lg font-bold mb-2" style={{ color: '#D9BB6E' }}>Skills Self-Assessment</h3>
          <p className="text-sm text-penfix-text-muted mb-6">
            Rate yourself honestly: 1 = No knowledge · 2 = Basic · 3 = Intermediate · 4 = Advanced · 5 = Expert
          </p>
          {Object.entries(skills).map(([category, skillList]) => (
            <div key={category} className="mb-8">
              <h4 className={`font-semibold text-base pb-2 border-b-2 ${isBonusCategory(team, category) ? 'mb-1' : 'mb-3'}`} style={{ color: '#D9BB6E', borderColor: '#C9A84C' }}>
                {category}
              </h4>
              {/* Same reassurance as the self-rating editor — a new hire meeting these seven
                  machine rows on day one should know they are optional, not a shortfall. */}
              {isBonusCategory(team, category) && (
                <p className="text-xs text-penfix-text-muted mb-3">{BONUS_CATEGORY_NOTE}</p>
              )}
              <div className="space-y-4">
                {(skillList as string[]).map((skill) => (
                  <div key={skill} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-penfix-card rounded-lg border border-penfix-border">
                    <span className="text-sm text-foreground flex-1">{skill}</span>
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
          <h3 className="text-lg font-bold" style={{ color: '#D9BB6E' }}>Review Your Submission</h3>

          <div className="bg-penfix-card rounded-xl border p-5 space-y-2">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-penfix-text-muted mb-3">Personal Information</h4>
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
                <span className="text-penfix-text-muted w-36 shrink-0">{label}:</span>
                <span className="text-foreground font-medium">{val}</span>
              </div>
            ) : null)}
          </div>

          <div className="bg-penfix-card rounded-xl border p-5">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-penfix-text-muted mb-3">Skills Summary</h4>
            {Object.entries(skills).map(([category, skillList]) => {
              const rated = (skillList as string[]).filter(s => (ratings[s] || 0) > 0)
              const avg = rated.length ? (rated.reduce((sum, s) => sum + (ratings[s] || 0), 0) / rated.length).toFixed(1) : 'N/A'
              return (
                <div key={category} className="text-sm mb-2">
                  <span className="text-foreground">{category}: </span>
                  <span className="font-semibold" style={{ color: '#D9BB6E' }}>{avg} avg</span>
                  <span className="text-penfix-text-muted ml-2">({rated.length}/{(skillList as string[]).length} rated)</span>
                </div>
              )
            })}
          </div>

          <p className="text-sm text-penfix-text-muted text-center">
            Please review your information before submitting. You cannot edit after submission.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t border-penfix-border">
        {step > 0 ? (
          <button onClick={back} className="px-6 py-2 border-2 rounded-lg font-semibold text-sm transition-colors"
            style={{ borderColor: '#C9A84C', color: '#D9BB6E' }}>
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
