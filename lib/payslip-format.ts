// Pure formatting helpers for the MyHR payslip pages. Deliberately no imports — shared
// between lib/payslips.ts (server-only, pulls in next/headers) and
// components/PayslipView.tsx ('use client'), neither of which can import the other.
// Ported from payroll/lib/payslip-print-format.ts so the period label reads identically
// to the payslip the payroll app itself prints.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatDateRangeLabel(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return ''
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  if (sy === ey && sm === em) {
    return sd === ed ? `${MONTH_NAMES[sm - 1]} ${sd}, ${sy}` : `${MONTH_NAMES[sm - 1]} ${sd}-${ed}, ${sy}`
  }
  return `${MONTH_NAMES[sm - 1]} ${sd}, ${sy} - ${MONTH_NAMES[em - 1]} ${ed}, ${ey}`
}
