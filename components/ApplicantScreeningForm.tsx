'use client'

import { useState } from 'react'
import { submitScreening } from '@/app/applicant-screening/actions'
import {
  SOFTWARE_OPTIONS, EDUCATION_LEVELS, EXPERIENCE_TYPES, SALARY_BASES,
  emptyExperience, type ExperienceEntry,
} from '@/lib/applicants'

const MAROON = '#4A0000'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
      <h3 className="font-bold text-base mb-4 pb-2 border-b" style={{ color: MAROON }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

const input = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'

export default function ApplicantScreeningForm({ token, label }: { token: string; label: string }) {
  const [experience, setExperience] = useState<ExperienceEntry[]>([emptyExperience()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function updateEntry(i: number, patch: Partial<ExperienceEntry>) {
    setExperience(prev => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('token', token)
    fd.set('experience', JSON.stringify(experience))
    try {
      const res = await submitScreening(fd)
      if (res.ok) setDone(true)
      else { setError(res.error); setSubmitting(false) }
    } catch {
      setError('Something went wrong submitting your form. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border shadow-sm p-10 text-center">
        <p className="text-3xl mb-3">✓</p>
        <h2 className="text-xl font-bold mb-2" style={{ color: MAROON }}>Thank you!</h2>
        <p className="text-gray-600 text-sm">
          Your information has been submitted to Penfix HR. We&apos;ll be in touch if your
          profile matches what we&apos;re looking for.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <p className="text-sm text-gray-500 mb-6">
        Hi{label ? ` ${label.split(' - ')[0]}` : ''} — please fill in the form below. Fields marked
        <span className="text-red-600"> *</span> are required. This link is for you only.
      </p>

      <Section title="1. Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><input name="full_name" required className={input} /></Field>
          <Field label="Nickname"><input name="nickname" className={input} /></Field>
          <Field label="Date of birth"><input type="date" name="date_of_birth" className={input} /></Field>
          <Field label="Mobile number" required><input name="mobile" required inputMode="tel" className={input} /></Field>
          <Field label="Email address" required><input type="email" name="email" required className={input} /></Field>
          <Field label="City / Municipality" required hint="So we know your commute distance">
            <input name="city" required className={input} />
          </Field>
        </div>
      </Section>

      <Section title="2. Position Applied For">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Position applying for" required><input name="position_applied" required className={input} /></Field>
          <Field label="Team" required>
            <select name="team" required defaultValue="" className={input}>
              <option value="" disabled>Select…</option>
              <option value="creative">Creative</option>
              <option value="production">Production</option>
            </select>
          </Field>
          <Field label="Earliest start date"><input type="date" name="earliest_start_date" className={input} /></Field>
          <Field label="How did you hear about us?"><input name="heard_about_us" className={input} /></Field>
        </div>
      </Section>

      <Section title="3. Skills & Software">
        <div className="flex flex-col gap-4">
          <Field label="Skills" hint="Separate with commas — e.g. layout design, tarpaulin printing, vinyl cutting">
            <input name="skills" className={input} />
          </Field>
          <Field label="Years of relevant experience">
            <input name="years_experience" inputMode="decimal" placeholder="e.g. 3" className={`${input} sm:w-40`} />
          </Field>
          <div>
            <span className="text-sm font-medium text-gray-700">Software you can use</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
              {SOFTWARE_OPTIONS.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" name="software" value={s} className="rounded border-gray-300" />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="4. Work Experience">
        <p className="text-xs text-gray-500 mb-4">
          Include employment, freelance work, and internship/OJT. Leave blank if you have none yet.
        </p>
        <div className="flex flex-col gap-4">
          {experience.map((entry, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-gray-500">Entry {i + 1}</span>
                {experience.length > 1 && (
                  <button type="button" onClick={() => setExperience(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-600 hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={entry.experience_type} onChange={e => updateEntry(i, { experience_type: e.target.value as ExperienceEntry['experience_type'] })} className={input}>
                    {EXPERIENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Company / Client">
                  <input value={entry.company} onChange={e => updateEntry(i, { company: e.target.value })} className={input} />
                </Field>
                <Field label="Position held">
                  <input value={entry.position} onChange={e => updateEntry(i, { position: e.target.value })} className={input} />
                </Field>
                <Field label="Salary rate" hint="Leave blank if you'd rather not say">
                  <div className="flex gap-2">
                    <input inputMode="numeric" value={entry.salary_rate ?? ''}
                      onChange={e => updateEntry(i, { salary_rate: e.target.value ? Number(e.target.value) : null })}
                      className={`${input} flex-1`} />
                    <select value={entry.salary_basis ?? 'Monthly'}
                      onChange={e => updateEntry(i, { salary_basis: e.target.value as ExperienceEntry['salary_basis'] })}
                      className={input}>
                      {SALARY_BASES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="Start date">
                  <input type="date" value={entry.start_date ?? ''} onChange={e => updateEntry(i, { start_date: e.target.value || null })} className={input} />
                </Field>
                <Field label="End date">
                  <input type="date" value={entry.end_date ?? ''} disabled={entry.is_current}
                    onChange={e => updateEntry(i, { end_date: e.target.value || null })}
                    className={`${input} disabled:bg-gray-100 disabled:text-gray-400`} />
                  <label className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <input type="checkbox" checked={entry.is_current}
                      onChange={e => updateEntry(i, { is_current: e.target.checked, end_date: e.target.checked ? null : entry.end_date })}
                      className="rounded border-gray-300" />
                    I currently work here
                  </label>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Reason for leaving">
                    <input value={entry.reason_for_leaving ?? ''} onChange={e => updateEntry(i, { reason_for_leaving: e.target.value || null })} className={input} />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setExperience(prev => [...prev, emptyExperience()])}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded text-white" style={{ backgroundColor: MAROON }}>
          + Add another
        </button>
      </Section>

      <Section title="5. Education">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Highest educational attainment">
            <select name="highest_education" defaultValue="" className={input}>
              <option value="">Select…</option>
              {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="School / University"><input name="school" className={input} /></Field>
          <Field label="Course or strand"><input name="course" className={input} /></Field>
          <Field label="Year graduated"><input name="year_graduated" inputMode="numeric" placeholder="e.g. 2021" className={input} /></Field>
        </div>
      </Section>

      <Section title="6. Salary & Expectations">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Expected salary — from" required>
              <input name="expected_salary_min" required inputMode="numeric" placeholder="e.g. 18000" className={input} />
            </Field>
            <Field label="Expected salary — to" required>
              <input name="expected_salary_max" required inputMode="numeric" placeholder="e.g. 22000" className={input} />
            </Field>
            <Field label="Basis" required>
              <select name="expected_salary_basis" required defaultValue="Monthly" className={input}>
                {SALARY_BASES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          <Field
            label="What are your expectations from the company?"
            hint="e.g. training and growth, working environment, schedule, career path"
          >
            <textarea name="expectations" rows={3} className={input} />
          </Field>
          <Field label="Portfolio or social media link" hint="Facebook page, Behance, Drive folder — anything showing your work">
            <input name="portfolio_url" className={input} />
          </Field>
          <Field label="Anything else you'd like us to know">
            <textarea name="notes" rows={3} className={input} />
          </Field>
        </div>
      </Section>

      {error && <p className="text-sm text-red-700 mb-4 text-center">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full text-white font-bold rounded-xl py-3 disabled:opacity-60"
        style={{ backgroundColor: MAROON }}>
        {submitting ? 'Submitting…' : 'Submit Application'}
      </button>
      <p className="text-xs text-gray-400 text-center mt-3 mb-10">
        You can only submit this form once. Please review your answers before sending.
      </p>
    </form>
  )
}
