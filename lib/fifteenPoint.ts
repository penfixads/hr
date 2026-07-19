// Penfix's actual quarterly manager evaluation ("15-Point Quarterly Evaluation Sheet"),
// transcribed from the manual Excel sheets (Evaluation 2026.xlsx) so employees can fill in
// the same 15 qualifications themselves instead of only having a manager-filled version.
// Items 1-10 are identical for every team; items 11-15 are role-specific (transcribed from
// the Production/Fabrication sheets vs. the Creative/Design sheet in that workbook).
export const FIFTEEN_POINT_COMMON: string[] = [
  'Initiative & Responsibility — Proactively takes on tasks, anticipates work needs, volunteers when required, and does not shift workload to others.',
  'Instruction Compliance & Accuracy — Follows instructions accurately, clarifies unclear directions promptly, and works with minimal supervision.',
  'Accountability & Humility — Owns mistakes honestly, accepts feedback without defensiveness, and takes corrective action promptly.',
  'Resourcefulness & Company Welfare — Uses company resources wisely, avoids waste, protects company interests, properly cares for all tools and equipment, and strictly follows log-in and log-out procedures for tools, systems, and machines used.',
  'Teamwork, Bayanihan & Knowledge Sharing — Collaborates effectively, supports teammates, and willingly shares knowledge, systems, or skills.',
  'Work Productivity & Focus — Maintains focus on priority tasks, avoids unnecessary idle time, and consistently meets deadlines.',
  'Punctuality & Attendance — Arrives on time, minimizes absences, communicates promptly when unable to report for work, and complies with established attendance and leave procedures.',
  'Learning & Adaptability — Learns quickly, adapts to changes or upgrades, and applies new systems or processes effectively.',
  'Professionalism, Respect & Emotional Control — Treats colleagues and clients courteously, maintains composure under pressure, and protects team harmony and company reputation.',
  'Quality Awareness & Error Prevention — Consistently checks work details and proactively reports issues or discrepancies before they escalate.',
]

export const FIFTEEN_POINT_PRODUCTION: string[] = [
  'Output Accuracy vs Job Order — Produces outputs that strictly match approved layouts, sizes, materials, and job order specifications.',
  'Material Use & Waste Control — Uses materials efficiently, minimizes spoilage, and promptly reports defects or errors.',
  'Fabrication Accuracy & Craftsmanship — Fabricates, assembles, and installs outputs accurately according to job order specifications, ensuring proper alignment, measurements, and finish.',
  'Production Speed & Workflow Discipline (MABILIS) — Completes production tasks efficiently without compromising quality or disrupting workflow.',
  'Quality, Durability & Safety Compliance (MATIBAY) — Ensures outputs are durable, properly finished, and produced under safe and compliant working conditions.',
]

export const FIFTEEN_POINT_CREATIVE: string[] = [
  'Design Accuracy & Brand Compliance — Produces designs that strictly follow job order details, brand guidelines, sizes, and specifications.',
  'Print-Ready File Preparation — Submits technically correct files (size, bleed, resolution, color mode, and format) ready for production without rework.',
  'Creative Brief Interpretation & Detail Control — Accurately interprets design briefs and proactively clarifies unclear requirements before execution.',
  'Revision Efficiency & Turnaround (MABILIS) — Implements revisions accurately and delivers layouts within agreed timelines, even during peak workload.',
  'Creative Problem-Solving & Design Ownership — Provides practical design solutions that balance aesthetics and feasibility, performs self-checks, and takes full ownership of design outcomes.',
]

export function getFifteenPointItems(team: string): string[] {
  const roleItems = team === 'creative' ? FIFTEEN_POINT_CREATIVE : FIFTEEN_POINT_PRODUCTION
  return [...FIFTEEN_POINT_COMMON, ...roleItems]
}

// Same formula as the manual sheet: TOTAL out of 150 (15 items x 10), PERCENTAGE = TOTAL/150.
export function computeFifteenPointTotal(ratings: Record<string, number>, items: string[]): number {
  return items.reduce((sum, item) => sum + (ratings[item] || 0), 0)
}

export function computeFifteenPointPercentage(total: number): number {
  return (total / (FIFTEEN_POINT_COMMON.length + FIFTEEN_POINT_PRODUCTION.length) / 10) * 100
}

export function fifteenPointBand(percentage: number): { label: string; color: string } {
  if (percentage >= 90) return { label: 'Excellent', color: '#16a34a' }
  if (percentage >= 86) return { label: 'Very Good', color: '#2563eb' }
  if (percentage >= 80) return { label: 'Good', color: '#ca8a04' }
  if (percentage >= 75) return { label: 'Fair', color: '#ea580c' }
  return { label: 'Needs Guidance', color: '#dc2626' }
}
