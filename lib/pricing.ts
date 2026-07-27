/** Piece price = stone/material + workmanship + silver grams × (spot/oz ÷ 31.1034768) × 1.05 */

export const TROY_OUNCE_GRAMS = 31.1034768
export const SILVER_MARKUP = 1.05

export type PriceInputs = {
  materialCost: number
  workmanshipCost: number
  silverGrams: number
}

export type PriceBreakdown = PriceInputs & {
  spotPerOz: number
  silverPerGram: number
  silverCost: number
  total: number
}

export function hasPricingFormula(input: {
  material_cost: number | null
  workmanship_cost: number | null
  silver_grams: number | null
}): boolean {
  return (
    input.material_cost !== null &&
    input.workmanship_cost !== null &&
    input.silver_grams !== null &&
    Number.isFinite(input.material_cost) &&
    Number.isFinite(input.workmanship_cost) &&
    Number.isFinite(input.silver_grams)
  )
}

/** USD per gram of silver at spot + 5%. */
export function silverPricePerGram(spotPerOz: number, markup = SILVER_MARKUP): number {
  if (!Number.isFinite(spotPerOz) || spotPerOz <= 0) return 0
  return (spotPerOz / TROY_OUNCE_GRAMS) * markup
}

export function computePriceBreakdown(
  inputs: PriceInputs,
  spotPerOz: number
): PriceBreakdown {
  const silverPerGram = silverPricePerGram(spotPerOz)
  const silverCost = inputs.silverGrams * silverPerGram
  const total = inputs.materialCost + inputs.workmanshipCost + silverCost
  return {
    ...inputs,
    spotPerOz,
    silverPerGram,
    silverCost,
    total: roundMoney(total),
  }
}

export function roundMoney(value: number): number {
  return Math.round(value)
}

export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Shop / vault listed price — whole dollars only. */
export function formatPiecePrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(price))
}

/** Spot / per-gram lines where cents still help. */
export function formatMoneyPrecise(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(price)
}

/** Public shop label: Sold, inquire, or $amount. */
export function piecePriceLabel(
  piece: {
    inquire_for_price: boolean
    price: number
    sold: boolean
    manual_price?: boolean
    material_cost: number | null
    workmanship_cost: number | null
    silver_grams: number | null
  },
  spotPerOz: number | null
): string {
  if (piece.sold) return 'Sold'
  if (piece.inquire_for_price) return 'Inquire for price'
  const amount = effectivePiecePrice(piece, spotPerOz)
  return formatPiecePrice(amount)
}

/**
 * Admin search / hub: always prefer the formula dollar amount so Mark can quote
 * on the phone even when the shop says Inquire.
 */
export function adminPiecePriceLabel(
  piece: {
    inquire_for_price: boolean
    price: number
    sold: boolean
    manual_price?: boolean
    material_cost: number | null
    workmanship_cost: number | null
    silver_grams: number | null
  },
  spotPerOz: number | null
): { amount: string | null; inquire: boolean } {
  if (piece.manual_price && piece.price > 0) {
    return {
      amount: formatPiecePrice(piece.price),
      inquire: piece.inquire_for_price,
    }
  }
  const hasFormula = hasPricingFormula(piece)
  if (hasFormula || (!piece.inquire_for_price && piece.price > 0)) {
    return {
      amount: formatPiecePrice(effectivePiecePrice(piece, spotPerOz)),
      inquire: piece.inquire_for_price,
    }
  }
  if (piece.inquire_for_price) return { amount: null, inquire: true }
  return { amount: formatPiecePrice(piece.price), inquire: false }
}

/**
 * Display / filter price.
 * - Inquire → treated as 0 for filters; UI uses label instead
 * - Sold → lock stored price (historical)
 * - Formula + spot → live calc
 * - Else stored price
 */
export function effectivePiecePrice(
  piece: {
    inquire_for_price: boolean
    price: number
    sold: boolean
    manual_price?: boolean
    material_cost: number | null
    workmanship_cost: number | null
    silver_grams: number | null
  },
  spotPerOz: number | null
): number {
  if (
    piece.sold ||
    piece.manual_price ||
    !hasPricingFormula(piece) ||
    spotPerOz === null
  ) {
    return piece.price
  }
  return computePriceBreakdown(
    {
      materialCost: piece.material_cost!,
      workmanshipCost: piece.workmanship_cost!,
      silverGrams: piece.silver_grams!,
    },
    spotPerOz
  ).total
}

export function normalizeCategoryList(primary: string, categories: string[]): string[] {
  const ordered = [primary, ...categories.filter((c) => c && c !== primary)]
  return Array.from(new Set(ordered.filter(Boolean)))
}

/** Overlay live formula price onto a piece (does not mutate sold / inquire / legacy rows). */
export function withLivePrice<T extends {
  inquire_for_price: boolean
  price: number
  sold: boolean
  manual_price?: boolean
  material_cost: number | null
  workmanship_cost: number | null
  silver_grams: number | null
}>(piece: T, spotPerOz: number | null): T {
  if (
    piece.inquire_for_price ||
    piece.sold ||
    piece.manual_price ||
    !hasPricingFormula(piece) ||
    spotPerOz === null
  ) {
    return piece
  }
  return {
    ...piece,
    price: computePriceBreakdown(
      {
        materialCost: piece.material_cost!,
        workmanshipCost: piece.workmanship_cost!,
        silverGrams: piece.silver_grams!,
      },
      spotPerOz
    ).total,
  }
}

export function withLivePrices<T extends {
  inquire_for_price: boolean
  price: number
  sold: boolean
  manual_price?: boolean
  material_cost: number | null
  workmanship_cost: number | null
  silver_grams: number | null
}>(pieces: T[], spotPerOz: number | null): T[] {
  return pieces.map((p) => withLivePrice(p, spotPerOz))
}
