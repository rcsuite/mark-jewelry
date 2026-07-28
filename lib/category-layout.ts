/**
 * How many category cards per row on desktop.
 * Keeps short counts on one row; avoids awkward 4+1 orphans.
 * Incomplete last rows sit in a centered flex row.
 */
export function categoryColumnsPerRow(count: number): number {
  if (count <= 1) return 1
  if (count <= 5) return count // 1–5: one row
  if (count === 6) return 3 // 3+3
  // Prefer 4, then 5, then 3 — skip widths that leave a single orphan
  for (const cols of [4, 5, 3] as const) {
    if (count % cols !== 1) return cols
  }
  return 4
}

/** Flex container: wraps + centers the last incomplete row (e.g. 4+3). */
export const CATEGORY_GRID_CLASS = 'flex flex-wrap justify-center gap-6'

/** Full class strings so Tailwind JIT can see them. */
const DESKTOP_WIDTH: Record<number, string> = {
  1: 'md:w-full md:max-w-md',
  2: 'md:w-[calc((100%-1.5rem)/2)]',
  3: 'md:w-[calc((100%-3rem)/3)]',
  4: 'md:w-[calc((100%-4.5rem)/4)]',
  5: 'md:w-[calc((100%-6rem)/5)]',
}

/**
 * Card width classes for the shared category layout.
 * Phone: 1 col. Tablet: up to 2. Desktop: count-aware columns.
 */
export function categoryItemWidthClass(count: number): string {
  const cols = categoryColumnsPerRow(count)
  const desktop = DESKTOP_WIDTH[cols] ?? DESKTOP_WIDTH[4]

  if (count <= 1) return `w-full ${desktop}`
  return `w-full sm:w-[calc((100%-1.5rem)/2)] ${desktop}`
}
