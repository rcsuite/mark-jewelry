/** Build a visitor message that keeps the piece tag visible in the thread. */
export function withPieceTag(body: string, pieceTitle: string | null | undefined): string {
  const trimmed = body.trim()
  if (!trimmed) return trimmed
  const title = pieceTitle?.trim()
  if (!title) return trimmed
  if (trimmed.startsWith('@')) return trimmed
  return `@${title}\n${trimmed}`
}

export function splitPieceTag(body: string): { tag: string | null; text: string } {
  const match = body.match(/^@([^\n]+)\n([\s\S]*)$/)
  if (!match) return { tag: null, text: body }
  return { tag: match[1].trim(), text: match[2] }
}
