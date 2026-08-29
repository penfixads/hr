'use client'

import Link from 'next/link'

// The employee-facing payslip, rendered from the frozen `payslips` row payroll released
// to MyHR. Ported from payroll/components/PayslipPrintView.tsx so the document reads
// identically to what the payroll app itself prints — same layout, same PENFIX PAYROLL
// 2026.xlsx line mapping. This copy is READ-ONLY: no "Send to myHR" button (that is the
// payroll admin's action) and no html-to-image "Copy as Image" (that package isn't a
// dependency here). The browser's own Print dialog covers "Save as PDF".
//
// All figures are read straight off the payslip row — this view never recomputes
// anything, it only formats. The one derived bit is the "RATE FOR [sub-range]" line for
// a mid-period new hire, whose date range the server page resolves and passes in.

// Plain comma-and-decimals, no peso sign — matches the template's number columns exactly.
const fmt = (n: number) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Bar({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#7A1828', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between',
      padding: '0.4rem 0.75rem', margin: '0.6rem 0',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export interface PayslipViewData {
  employeeName: string
  durationLabel: string
  monthlyRate: number
  semiMonthlyRate: number
  dailyRate: number
  // Only set for a new hire whose date_joined falls inside this period.
  proratedRange: string | null
  proratedRate: number | null
  overtimeHours: number
  overtimePay: number
  nightDiffHours: number // night_diff_hours + sunday_premium_hours, combined for display
  nightDiffPay: number // night_diff_pay + sunday_premium_pay, combined for display
  holidayPay: number
  holidayPayNote: string | null
  grossPay: number
  regularLoanPrincipal: number
  regularLoanRemaining: number
  valeDue: number
  cashAdvance: number
  lateUndertimeHours: number
  lateUndertimeDeduction: number
  unpaidLeaveDays: number
  unpaidLeaveDeduction: number
  sss: number
  pagibig: number
  philhealth: number
  totalDeduction: number
  netPay: number
  sickCredit: number
  sickUsed: number
  sickRemaining: number
  vacationCredit: number
  vacationUsed: number
  vacationRemaining: number
  lateSanctionCount: number
  preparedBy: string | null
  sentAt: string | null
}

export default function PayslipView(d: PayslipViewData) {
  return (
    <div style={{ minHeight: '100vh', background: '#e8e8e8' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .payslip-sheet { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/payslips" style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #999', color: '#333', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, background: '#fff' }}>
            ← Back
          </Link>
          <button onClick={() => window.print()} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', color: '#fff', background: '#7A1828', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Print / Save as PDF
          </button>
        </div>
        {d.sentAt && (
          <div style={{ color: '#888', fontSize: '0.7rem', textAlign: 'center' }}>
            Released to your MyHR on {new Date(d.sentAt).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="payslip-sheet" style={{
        maxWidth: 720, margin: '0 auto 2rem', background: '#fff', border: '1px solid #ccc',
        padding: '2rem 2.25rem', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.85rem', color: '#1a1a1a',
      }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em' }}>PENFIX ADVERTISING AND BUSINESS SOLUTIONS</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 2 }}>PAYSLIP</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/penfix-logo.png" alt="Penfix" width={70} height={70} style={{ objectFit: 'contain', position: 'absolute', top: 0, right: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>

        <div style={{ background: '#7A1828', color: '#fff', borderRadius: '10px 10px 0 0', padding: '0.6rem 0.9rem' }}>
          <Row label="EMPLOYEE NAME:" value={d.employeeName} bold />
          <Row label="PAYROLL DURATION:" value={d.durationLabel} bold />
        </div>

        <div style={{ height: '0.75rem' }} />

        <Row label="MONTHLY RATE" value={fmt(d.monthlyRate)} />
        <Row label="SEMI-MONTHLY RATE" value={fmt(d.semiMonthlyRate)} />
        <Row label="DAILY RATE" value={fmt(d.dailyRate)} />
        {d.proratedRange && d.proratedRate !== null && (
          <Row label={`RATE FOR ${d.proratedRange.toUpperCase()}`} value={fmt(d.proratedRate)} />
        )}

        <div style={{ height: '0.75rem' }} />

        <div style={{ fontWeight: 700, marginBottom: 2 }}>Other Earnings:</div>
        <Row label={`Overtime (${d.overtimeHours} hrs)`} value={fmt(d.overtimePay)} />
        <Row label={`Night Differential/ Sunday Premium (${d.nightDiffHours} hrs)`} value={fmt(d.nightDiffPay)} />
        <Row label="Holiday Pay" value={fmt(d.holidayPay)} />
        {d.holidayPayNote && (
          <div style={{ fontSize: '0.72rem', color: '#777', marginTop: -2, marginBottom: 2 }}>{d.holidayPayNote}</div>
        )}

        <Bar label="Gross Pay:" value={fmt(d.grossPay)} />

        <div style={{ fontWeight: 700, marginBottom: 2 }}>DEDUCTIONS:</div>
        <Row label="Regular Loan:" value={fmt(d.regularLoanPrincipal)} />
        <Row label="Remaining Loan:" value={fmt(d.regularLoanRemaining)} />
        <Row label="Vale Due:" value={fmt(d.valeDue)} />
        <Row label="Cash Advance:" value={fmt(d.cashAdvance)} />
        <Row label={`Late/Undertime (${d.lateUndertimeHours} hrs)`} value={fmt(d.lateUndertimeDeduction)} />
        <Row label={`Absences (${d.unpaidLeaveDays} day${d.unpaidLeaveDays === 1 ? '' : 's'})`} value={fmt(d.unpaidLeaveDeduction)} />

        <div style={{ height: '0.5rem' }} />

        <div style={{ fontWeight: 700, marginBottom: 2 }}>Others:</div>
        <Row label="SSS" value={fmt(d.sss)} />
        <Row label="PAG-IBIG" value={fmt(d.pagibig)} />
        <Row label="PHILHEALTH" value={fmt(d.philhealth)} />
        <Row label="Total Deduction" value={fmt(d.totalDeduction)} bold />

        <Bar label="Net Pay:" value={fmt(d.netPay)} />

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#7A1828' }}>Sick Leave</div>
            <Row label="Credit" value={fmt(d.sickCredit)} />
            <Row label="Used" value={fmt(d.sickUsed)} />
            <Row label="Remaining" value={fmt(d.sickRemaining)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#7A1828' }}>Vacation Leave</div>
            <Row label="Credit" value={fmt(d.vacationCredit)} />
            <Row label="Used" value={fmt(d.vacationUsed)} />
            <Row label="Remaining" value={fmt(d.vacationRemaining)} />
          </div>
        </div>

        <Bar label="LATE FOR REPRIMAND ACTION" value={fmt(d.lateSanctionCount)} />

        <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#666' }}>Prepared by:</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{d.preparedBy || '—'}</div>
        </div>
      </div>
    </div>
  )
}
