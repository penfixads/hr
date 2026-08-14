'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface EditableFields {
  nickname: string
  date_of_birth: string
  position: string
  address: string
  mobile: string
  telephone: string
  email: string
  sss_number: string
  pagibig_number: string
  philhealth_number: string
  emergency_name: string
  emergency_relationship: string
  emergency_mobile: string
  emergency_alt: string
}

interface Props {
  employeeId: string
  initial: EditableFields
}

// Capitalizes the first letter of each word/hyphenated segment as the user types, without
// touching the rest of what they typed — mirrors EmployeeForm's toTitleCase for name fields.
function toTitleCase(value: string) {
  return value.replace(/(^|[\s-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase())
}

export default function EmployeeEditForm({ employeeId, initial }: Props) {
  const router = useRouter()
  const [fields, setFields] = useState<EditableFields>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) =>
    setFields(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!fields.position || !fields.address || !fields.mobile || !fields.email) {
      setError('Position, Address, Mobile Number, and Email are required.')
      return
    }
    if (!fields.emergency_name || !fields.emergency_relationship || !fields.emergency_mobile) {
      setError('Please fill in all required emergency contact fields.')
      return
    }
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: sbErr } = await (supabase as any).from('employees').update({
        ...fields,
        date_of_birth: fields.date_of_birth || null,
      }).eq('id', employeeId)
      if (sbErr) throw sbErr
      setSaved(true)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
  const focusStyle = { '--tw-ring-color': '#C9A84C' } as React.CSSProperties
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"
  const requiredStar = <span className="text-red-500 ml-0.5">*</span>

  return (
    <div className="bg-white rounded-xl border p-5 space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nickname / Preferred Name</label>
            <input style={focusStyle} className={inputClass} value={fields.nickname}
              onChange={e => set('nickname', toTitleCase(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input type="date" style={focusStyle} className={inputClass} value={fields.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Current Position / Role {requiredStar}</label>
            <input style={focusStyle} className={inputClass} value={fields.position}
              onChange={e => set('position', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Complete Home Address {requiredStar}</label>
            <textarea style={focusStyle} className={inputClass} rows={2} value={fields.address}
              onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Mobile Number {requiredStar}</label>
            <input type="tel" style={focusStyle} className={inputClass} value={fields.mobile}
              onChange={e => set('mobile', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telephone / Landline</label>
            <input type="tel" style={focusStyle} className={inputClass} value={fields.telephone}
              onChange={e => set('telephone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Email Address {requiredStar}</label>
            <input type="email" style={focusStyle} className={inputClass} value={fields.email}
              onChange={e => set('email', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Government Numbers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>SSS Number</label>
            <input style={focusStyle} className={inputClass} value={fields.sss_number}
              onChange={e => set('sss_number', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Pag-IBIG MID Number</label>
            <input style={focusStyle} className={inputClass} value={fields.pagibig_number}
              onChange={e => set('pagibig_number', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>PhilHealth Number</label>
            <input style={focusStyle} className={inputClass} value={fields.philhealth_number}
              onChange={e => set('philhealth_number', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#4A0000' }}>Emergency Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Emergency Contact Name {requiredStar}</label>
            <input style={focusStyle} className={inputClass} value={fields.emergency_name}
              onChange={e => set('emergency_name', toTitleCase(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Relationship {requiredStar}</label>
            <input style={focusStyle} className={inputClass} value={fields.emergency_relationship}
              onChange={e => set('emergency_relationship', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Emergency Mobile {requiredStar}</label>
            <input type="tel" style={focusStyle} className={inputClass} value={fields.emergency_mobile}
              onChange={e => set('emergency_mobile', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Alternative Contact</label>
            <input type="tel" style={focusStyle} className={inputClass} value={fields.emergency_alt}
              onChange={e => set('emergency_alt', e.target.value)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {saved && !error && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">Changes saved.</div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button onClick={() => router.push('/my-records')}
          className="px-6 py-2 border-2 rounded-lg font-semibold text-sm transition-colors"
          style={{ borderColor: '#4A0000', color: '#4A0000' }}>
          Back to MyHR
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-8 py-2 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#C9A84C' }}>
          {saving ? 'Saving...' : '✓ Save Changes'}
        </button>
      </div>
    </div>
  )
}
