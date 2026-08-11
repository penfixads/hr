// The one creative-team category that scores as a bonus rather than a requirement. Declared
// before CREATIVE_SKILLS so it can be used as the category key itself -- that way the name
// exists in exactly one place and the scoring code below can't drift from the data.
export const CREATIVE_BONUS_CATEGORY = 'Cross-Training (Bonus)'

// Shown under the bonus category heading so employees understand a low rating here is not
// held against them -- otherwise a "1 - No knowledge" row reads like a failure.
export const BONUS_CATEGORY_NOTE =
  'Not required for this role. Rating these can only add to your score, never subtract from it.'

export const CREATIVE_SKILLS = {
  'Design Skills': [
    'Ability to create layouts using Adobe Photoshop',
    'Ability to create vector-based designs using Adobe Illustrator or CorelDRAW',
    'Preparing print-ready files (correct size, bleed, color mode, resolution)',
    'Translating client instructions into accurate visual layouts',
    'Applying branding guidelines and visual consistency',
    'Designing creatives for social media and digital platforms',
    'Accuracy and attention to detail during revisions and final checking',
    'Understanding production limitations when designing',
    'Speed and efficiency in completing design tasks without sacrificing quality',
    'Ability to troubleshoot and correct layout or file issues independently',
    'Ability to create social media creatives',
    'Ability to run ads on different social media platforms',
    'Ability to compose content scripts',
    'Ability to create websites and landing pages',
    'Ability to manipulate and retouch images',
  ],
  'Operations Skills': [
    'Understanding job orders and instructions accurately',
    'Following SOPs and internal processes',
    'Time management and meeting deadlines',
    'Attention to detail in assigned tasks',
    'Problem-solving during work challenges',
    'Ability to work under pressure',
    'Team coordination and cooperation',
    'Proper use and care of company tools and equipment',
  ],
  // Split out of 'Operations Skills' (2026-08-12). These are the same seven machine skills
  // the production team is graded on as core work (PRODUCTION_SKILLS['Fabrication Skills']),
  // but a graphics artist is not hired to run a heat press. Penfix encourages the
  // cross-training, so they stay on the sheet and still earn credit -- they just no longer
  // count as a requirement. See BONUS_MAX_UPLIFT / computeSkillsScore below for the scoring.
  //
  // The skill NAMES are deliberately unchanged: ratings are stored keyed by name
  // (employees.skills_self_rating / skills_boss_rating), so recategorising them here does
  // not orphan a single existing rating and needs no backfill.
  [CREATIVE_BONUS_CATEGORY]: [
    'Tarpaulin Printing Machine Operation',
    'Cutter Plotter Machine Operation',
    'Laser Cutting Operation',
    'Heat Press Machine Operation',
    'Manual Laminating Machine Operation',
    'Ability to laminate stickers without using a laminator',
    'Sticker application on sintra and acrylics',
  ],
}

export const PRODUCTION_SKILLS = {
  'Fabrication Skills': [
    'Tarpaulin Printing Machine Operation',
    'Cutter Plotter Machine Operation',
    'Laser Cutting Operation',
    'Heat Press Machine Operation',
    'Manual Laminating Machine Operation',
    'Ability to laminate stickers without using a laminator',
    'Cutting/Trimming Accuracy using cutters',
    'Cutting/Trimming Accuracy using grinders',
    'Power Tools and Equipment Handling',
    'Sticker Application on Walls and Glass',
    'Sticker Application on Vehicles',
    'Sticker Application on Sintra',
    'Tending flex/tarpaulins on frames for panaflex and digiflex',
    'Welding frames',
    'Applying stickers on signage and flex',
    'Installing LED tube lights on panaflex and digiflex signages',
    'Installing LED modules on signages and wiring to power supplies',
    'Tapping signage circuits to electricity source for lighting',
    'Buildup signages using Sintra boards and Versa boards',
    'Buildup signages using Acrylic',
    'Buildup signages using Stainless',
    'Buildup signages using ACP',
    'Manually cut sticker letters',
    'Manually cut stainless elements and logos',
    'Installation of indoor signages',
    'Installation of outdoor signages',
    'Ability to paint evenly using spray paints',
    'Ability to paint using compressor',
    'Ability to glue acrylic without stains',
    'Ability to seam tarpaulins',
  ],
}

export type SkillsMap = typeof CREATIVE_SKILLS | typeof PRODUCTION_SKILLS

export function getSkillsForTeam(team: string): SkillsMap {
  return team === 'creative' ? CREATIVE_SKILLS : PRODUCTION_SKILLS
}

// Production is graded on the machine skills as core work, so nothing is a bonus for them --
// the same seven rows that are a "plus" for a GA are the job itself for a fabricator.
export function bonusCategoriesForTeam(team: string): string[] {
  return team === 'creative' ? [CREATIVE_BONUS_CATEGORY] : []
}

export function isBonusCategory(team: string, category: string): boolean {
  return bonusCategoriesForTeam(team).includes(category)
}

// Most a fully-mastered set of bonus skills can add to the overall score. Deliberately small:
// cross-training should be visible in the number without ever outweighing the design and
// client work a graphics artist is actually evaluated on. Policy decision 2026-08-12 -- change
// this one constant to retune it, both the admin list and the assessment page read it.
export const BONUS_MAX_UPLIFT = 0.25

export type SkillsScore = {
  // Mean of the rated CORE skills only -- what the employee is actually held to.
  core: number
  coreRatedCount: number
  // Mean of the rated bonus skills. Reported for display; it never enters `core`.
  bonusAvg: number
  bonusRatedCount: number
  // What the bonus adds, 0..BONUS_MAX_UPLIFT. Never negative.
  uplift: number
  // core + uplift, capped at 5. This is the number the raise band reads.
  overall: number
}

// A skill rated by both self and management averages the two; rated by only one side uses
// that side; unrated returns null so it can be skipped rather than counted as a zero.
function pairValue(selfRating: number, bossRating: number): number | null {
  if (selfRating > 0 && bossRating > 0) return (selfRating + bossRating) / 2
  if (selfRating > 0) return selfRating
  if (bossRating > 0) return bossRating
  return null
}

const mean = (values: number[]): number =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0

// Single definition of the skills score, used by both the assessment page
// (components/BossRatingEditor.tsx) and the admin employee list (app/admin/page.tsx) -- they
// each had their own copy of a flat unweighted mean, which is how the bonus skills came to
// drag a graphics artist's raise band down by 23% of the score.
//
// The uplift scales from nothing at "1 - No knowledge" to the full BONUS_MAX_UPLIFT at
// "5 - Expert", so someone who has never touched a machine is neither rewarded nor penalised,
// and someone who has genuinely cross-trained is.
export function computeSkillsScore(
  team: string,
  self: Record<string, number> | null | undefined,
  boss: Record<string, number> | null | undefined
): SkillsScore {
  const selfRatings = self ?? {}
  const bossRatings = boss ?? {}
  const coreValues: number[] = []
  const bonusValues: number[] = []

  for (const [category, skillList] of Object.entries(getSkillsForTeam(team))) {
    const bucket = isBonusCategory(team, category) ? bonusValues : coreValues
    for (const skill of skillList as string[]) {
      const value = pairValue(selfRatings[skill] ?? 0, bossRatings[skill] ?? 0)
      if (value !== null) bucket.push(value)
    }
  }

  const core = mean(coreValues)
  const bonusAvg = mean(bonusValues)
  const uplift = bonusValues.length > 0
    ? Math.max(0, Math.min(1, (bonusAvg - 1) / 4)) * BONUS_MAX_UPLIFT
    : 0

  return {
    core,
    coreRatedCount: coreValues.length,
    bonusAvg,
    bonusRatedCount: bonusValues.length,
    uplift,
    // With no core ratings there is nothing to be bonused ON -- reporting a bare 0.25 for
    // someone who only filled in the machine rows would misrepresent an empty assessment.
    overall: coreValues.length > 0 ? Math.min(5, core + uplift) : 0,
  }
}

export function raiseLabel(score: number): { label: string; note: string; color: string } {
  if (score >= 4.5) return { label: 'Excellent', note: 'High raise consideration', color: '#16a34a' }
  if (score >= 3.5) return { label: 'Good', note: 'Standard raise consideration', color: '#2563eb' }
  if (score >= 2.5) return { label: 'Average', note: 'Minimal raise consideration', color: '#ca8a04' }
  return { label: 'Needs Improvement', note: 'No raise recommended', color: '#dc2626' }
}
