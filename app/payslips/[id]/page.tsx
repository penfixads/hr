import { notFound } from 'next/navigation'
import PayslipView from '@/components/PayslipView'
import { getMyPayslip } from '@/lib/payslips'
import { formatDateRangeLabel } from '@/lib/payslip-format'
import { titleCase } from '@/lib/text'

export const metadata = {
  title: 'Payslip — Penfix',
}

// Renders full-page with no MyHR chrome — it's a printable document, same as the payroll
// app's own payslip route. getMyPayslip returns null for anything that isn't the caller's
// own released payslip, which becomes a 404 here.
export const dynamic = 'force-dynamic'

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getMyPayslip(id)
  if (!p) notFound()

  const isMidPeriodHire =
    !!p.dateJoined && !!p.periodStart && !!p.periodEnd &&
    p.dateJoined > p.periodStart && p.dateJoined <= p.periodEnd

  return (
    <PayslipView
      employeeName={titleCase(p.employeeName)}
      durationLabel={formatDateRangeLabel(p.periodStart, p.periodEnd)}
      monthlyRate={p.monthlyRate}
      semiMonthlyRate={p.monthlyRate / 2}
      dailyRate={p.perDayRate}
      proratedRange={isMidPeriodHire ? formatDateRangeLabel(p.dateJoined!, p.periodEnd) : null}
      proratedRate={isMidPeriodHire ? p.basePay : null}
      overtimeHours={p.overtimeHours}
      overtimePay={p.overtimePay}
      nightDiffHours={p.nightDiffHours + p.sundayPremiumHours}
      nightDiffPay={p.nightDiffPay + p.sundayPremiumPay}
      holidayPay={p.holidayPay}
      holidayPayNote={p.holidayPayNote}
      grossPay={p.grossPay}
      regularLoanPrincipal={p.regularLoanPrincipal}
      regularLoanRemaining={p.regularLoanRemaining}
      valeDue={p.regularLoanDeduction}
      cashAdvance={p.cashAdvanceDeduction}
      lateUndertimeHours={p.lateUndertimeHours}
      lateUndertimeDeduction={p.lateUndertimeDeduction}
      unpaidLeaveDays={p.unpaidLeaveDays}
      unpaidLeaveDeduction={p.unpaidLeaveDeduction}
      sss={p.sssDeduction}
      pagibig={p.pagibigDeduction}
      philhealth={p.philhealthDeduction}
      totalDeduction={p.totalDeduction}
      netPay={p.netPay}
      sickCredit={p.sickLeaveCredit}
      sickUsed={p.sickLeaveUsed}
      sickRemaining={p.sickLeaveRemaining}
      vacationCredit={p.vacationLeaveCredit}
      vacationUsed={p.vacationLeaveUsed}
      vacationRemaining={p.vacationLeaveRemaining}
      lateSanctionCount={p.lateSanctionCount}
      preparedBy={p.preparedBy}
      sentAt={p.sentAt}
    />
  )
}
