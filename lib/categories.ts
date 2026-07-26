/** Sentinel value for the "Other (Specify)" option in category selects. */
export const OTHER_CATEGORY = '__other__'

/** Turn a free-text category name into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
