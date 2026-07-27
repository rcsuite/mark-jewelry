import Link from 'next/link'
import { splitPieceTag } from '@/lib/chat-format'

/** Renders a chat body, highlighting a leading @Piece line when present. */
export default function ChatBubbleBody({
  body,
  fallbackPieceId,
}: {
  body: string
  /** Used when older messages stored @Title without an embedded id. */
  fallbackPieceId?: string | null
}) {
  const { tag, text, pieceId } = splitPieceTag(body)

  if (!tag) {
    return <span className="whitespace-pre-wrap">{body}</span>
  }

  const hrefId = pieceId || fallbackPieceId || null

  return (
    <span className="block">
      {hrefId ? (
        <Link
          href={`/shop/${hrefId}`}
          className="block text-xs text-[#14B8A6] font-medium mb-1 truncate underline-offset-2 hover:underline hover:text-[#00F2FE]"
        >
          @{tag}
        </Link>
      ) : (
        <span className="block text-xs text-[#14B8A6] font-medium mb-1 truncate">@{tag}</span>
      )}
      <span className="whitespace-pre-wrap">{text}</span>
    </span>
  )
}
