'use client'

import { useContactOptional } from '@/components/chat/ContactProvider'

type Props = {
  children: React.ReactNode
  className?: string
  pieceId?: string | null
  pieceTitle?: string | null
}

/** Opens the contact popup; falls back to /contact deep-link if provider missing. */
export default function ContactTrigger({ children, className, pieceId, pieceTitle }: Props) {
  const contact = useContactOptional()

  if (!contact) {
    const params = new URLSearchParams({ contact: '1' })
    if (pieceId) params.set('piece', pieceId)
    if (pieceTitle) params.set('title', pieceTitle)
    return (
      <a href={`/?${params.toString()}`} className={className}>
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        contact.openContact({
          pieceId,
          pieceTitle,
          viewingContext: pieceTitle,
        })
      }
    >
      {children}
    </button>
  )
}
