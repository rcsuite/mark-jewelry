/** Build a visitor message that keeps the piece tag visible in the thread. */
export function withPieceTag(
  body: string,
  pieceTitle: string | null | undefined,
  pieceId?: string | null
): string {
  const trimmed = body.trim()
  if (!trimmed) return trimmed
  const title = pieceTitle?.trim()
  if (!title) return trimmed
  if (trimmed.startsWith('@')) return trimmed
  const id = pieceId?.trim()
  const tag = id ? `@${title} <#${id}>` : `@${title}`
  return `${tag}\n${trimmed}`
}

const PIECE_ID_RE =
  /^(.+?)\s*<#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>\s*$/i

export function splitPieceTag(body: string): {
  tag: string | null
  pieceId: string | null
  text: string
} {
  const match = body.match(/^@([^\n]+)\n([\s\S]*)$/)
  if (!match) return { tag: null, pieceId: null, text: body }

  const rawTag = match[1].trim()
  const idMatch = rawTag.match(PIECE_ID_RE)
  if (idMatch) {
    return {
      tag: idMatch[1].trim(),
      pieceId: idMatch[2],
      text: match[2],
    }
  }

  return { tag: rawTag, pieceId: null, text: match[2] }
}
