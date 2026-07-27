import { splitPieceTag } from '@/lib/chat-format'

/** Renders a chat body, highlighting a leading @Piece line when present. */
export default function ChatBubbleBody({ body }: { body: string }) {
  const { tag, text } = splitPieceTag(body)

  if (!tag) {
    return <span className="whitespace-pre-wrap">{body}</span>
  }

  return (
    <span className="block">
      <span className="block text-xs text-[#14B8A6] font-medium mb-1 truncate">@{tag}</span>
      <span className="whitespace-pre-wrap">{text}</span>
    </span>
  )
}
