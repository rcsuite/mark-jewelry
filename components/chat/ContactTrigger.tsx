'use client'

import { useContactOptional } from '@/components/chat/ContactProvider'

type Props = {
  children: React.ReactNode
  className?: string
  pieceId?: string | null
  pieceTitle?: string | null
}

/**
 * Opens the contact popup. Always renders a <button> so SSR/client HTML matches
 * (provider used to sit behind Suspense and briefly look missing on the server).
 */
export default function ContactTrigger({ children, className, pieceId, pieceTitle }: Props) {
  const contact = useContactOptional()

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (contact) {
          contact.openContact({
            pieceId,
            pieceTitle,
            viewingContext: pieceTitle,
          })
          return
        }
        const params = new URLSearchParams({ contact: '1' })
        if (pieceId) params.set('piece', pieceId)
        if (pieceTitle) params.set('title', pieceTitle)
        window.location.assign(`/?${params.toString()}`)
      }}
    >
      {children}
    </button>
  )
}
