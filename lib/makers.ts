/** Who forged the piece — shown on /shop/[id] only. */
export type PieceMaker = 'mark' | 'joeline'

export const PIECE_MAKERS: { id: PieceMaker; label: string }[] = [
  { id: 'mark', label: 'Mark' },
  { id: 'joeline', label: 'Joeline' },
]

export function normalizePieceMaker(value: unknown): PieceMaker {
  return value === 'joeline' ? 'joeline' : 'mark'
}

export function makerDisplayName(maker: PieceMaker): string {
  return maker === 'joeline' ? 'Joeline' : 'Mark'
}
