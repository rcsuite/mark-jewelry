import type { Category, ShopPiece } from '@/lib/types'

/** Fold accents and case for forgiving vault search. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export type ShopFilters = {
  query: string
  category: string
  pieceType: string
  material: string
  minPrice: string
  maxPrice: string
}

export const EMPTY_SHOP_FILTERS: ShopFilters = {
  query: '',
  category: 'all',
  pieceType: '',
  material: '',
  minPrice: '',
  maxPrice: '',
}

export function pieceSearchHaystack(item: ShopPiece, categories: Category[]): string {
  const slugs = item.categories?.length ? item.categories : [item.category]
  const categoryLabels = slugs
    .map((slug) => {
      const match = categories.find((c) => c.slug === slug)
      return match ? `${match.title} ${match.short_name} ${slug}` : slug
    })
    .join(' ')

  return [
    item.title,
    item.description ?? '',
    ...slugs,
    categoryLabels,
    item.piece_type,
    item.specs?.material ?? '',
    item.specs?.weight ?? '',
    item.specs?.size ?? '',
    item.specs?.width ?? '',
    String(item.price),
    item.inquire_for_price ? 'inquire' : '',
    ...(item.tags ?? []),
  ].join(' ')
}

/** Every whitespace-separated term must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const normalized = normalizeSearchText(haystack)
  return terms.every((term) => normalized.includes(term))
}

export function filterShopItems(
  items: ShopPiece[],
  categories: Category[],
  filters: ShopFilters
): ShopPiece[] {
  const min = filters.minPrice.trim() === '' ? null : Number(filters.minPrice)
  const max = filters.maxPrice.trim() === '' ? null : Number(filters.maxPrice)
  const materialNeedle = normalizeSearchText(filters.material)
  const pieceTypeNeedle = normalizeSearchText(filters.pieceType)

  return items.filter((item) => {
    if (filters.category !== 'all') {
      const inCategories = (item.categories ?? []).includes(filters.category)
      if (!inCategories && item.category !== filters.category) return false
    }

    if (pieceTypeNeedle) {
      if (!normalizeSearchText(item.piece_type).includes(pieceTypeNeedle)) return false
    }

    if (materialNeedle) {
      const mat = normalizeSearchText(item.specs?.material ?? '')
      if (!mat.includes(materialNeedle)) return false
    }

    if (min !== null && !Number.isNaN(min) && item.price < min) return false
    if (max !== null && !Number.isNaN(max) && item.price > max) return false

    return matchesQuery(pieceSearchHaystack(item, categories), filters.query)
  })
}

export function uniquePieceTypes(items: ShopPiece[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (item.piece_type.trim()) set.add(item.piece_type.trim())
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export function uniqueMaterials(items: ShopPiece[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    const mat = item.specs?.material?.trim()
    if (mat) set.add(mat)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export function filtersFromSearchParams(params: URLSearchParams): ShopFilters {
  return {
    query: params.get('q') ?? '',
    category: params.get('category') || 'all',
    pieceType: params.get('type') ?? '',
    material: params.get('material') ?? '',
    minPrice: params.get('min') ?? '',
    maxPrice: params.get('max') ?? '',
  }
}

export function searchParamsFromFilters(filters: ShopFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query.trim()) params.set('q', filters.query.trim())
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.pieceType.trim()) params.set('type', filters.pieceType.trim())
  if (filters.material.trim()) params.set('material', filters.material.trim())
  if (filters.minPrice.trim()) params.set('min', filters.minPrice.trim())
  if (filters.maxPrice.trim()) params.set('max', filters.maxPrice.trim())
  return params
}

export function countActiveDetailFilters(filters: ShopFilters): number {
  let n = 0
  if (filters.pieceType.trim()) n += 1
  if (filters.material.trim()) n += 1
  if (filters.minPrice.trim()) n += 1
  if (filters.maxPrice.trim()) n += 1
  if (filters.category !== 'all') n += 1
  return n
}
