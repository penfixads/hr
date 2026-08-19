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
