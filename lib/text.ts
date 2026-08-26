// Normalizes a name for display — lowercases first so inconsistently-entered data
// (e.g. "Fortunato luna reyes jr", or an all-caps import) renders in consistent Title
// Case, then capitalizes the first letter of every space/hyphen-separated word.
// Distinct from EmployeeForm.tsx's local toTitleCase, which only touches word-initial
// letters as you type so it doesn't clobber an intentional interior cap (e.g.
// "McDonald") mid-edit — this one is for read-only display, where a full normalize is
// what actually fixes existing messy data.
export function titleCase(value?: string | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, char: string) => sep + char.toUpperCase())
}

// Filipino surname particles that form part of the surname, not a middle name of their
// own — "Dela Cruz", "Del Rosario", "De Leon", "San Pedro" etc. are one surname, so
// taking just the trailing word would sort "John ... Dela Cruz" under C instead of D.
const SURNAME_PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'della', 'san', 'santa', 'santo', 'dos', 'da', 'van', 'von', 'mac', 'mc'])
// Trailing generational suffixes aren't part of the surname either — "Fortunato Luna
// Reyes Jr" should sort as "Reyes", not "Jr".
const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[.,]/g, '')
}

// Best-effort surname extraction for alphabetizing a full_name string when there's no
// separate surname column (no employees table here has one) — full_name is only ever
// "First [Middle...] Last[, Suffix]" in practice. Not perfect (a name that's genuinely
// just one surname-shaped word after a particle, e.g. a two-word first name, would be
// misread), but it's right for every name on the current roster and degrades gracefully
// to "last word" elsewhere. Display-sort only — never used to split/store a real
// first/last name pair.
export function surnameKey(fullName?: string | null): string {
  if (!fullName) return ''
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  while (tokens.length > 1 && NAME_SUFFIXES.has(normalizeToken(tokens[tokens.length - 1]))) tokens.pop()
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0].toLowerCase()
  const particle = normalizeToken(tokens[tokens.length - 2])
  const surname = SURNAME_PARTICLES.has(particle)
    ? tokens.slice(-2).join(' ')
    : tokens[tokens.length - 1]
  return surname.toLowerCase()
}
