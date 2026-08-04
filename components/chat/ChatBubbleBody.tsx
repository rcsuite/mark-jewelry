'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PaymentHandles } from '@/lib/types'
import {
  parsePaymentToken,
  paymentHandleFor,
  paymentPillLabel,
  splitPieceTag,
} from '@/lib/chat-format'
import PaymentDetailSheet from '@/components/chat/PaymentDetailSheet'

/** Renders a chat body: optional @Piece line, payment pill, and plain text. */
export default function ChatBubbleBody({
  body,
  fallbackPieceId,
  paymentHandles,
}: {
  body: string
  /** Used when older messages stored @Title without an embedded id. */
  fallbackPieceId?: string | null
  paymentHandles?: PaymentHandles | null
}) {
  const { tag, text: afterPiece, pieceId } = splitPieceTag(body)
  const { method, offer, text } = parsePaymentToken(afterPiece)
  const [sheetOpen, setSheetOpen] = useState(false)

  const hrefId = pieceId || fallbackPieceId || null
  const handle = method ? paymentHandleFor(method, paymentHandles) : null
  const canOpen = Boolean(method && handle)

  return (
    <span className="block">
      {tag &&
        (hrefId ? (
          <Link
            href={`/shop/${hrefId}`}
            className="block text-xs text-[#14B8A6] font-medium mb-1 truncate underline-offset-2 hover:underline hover:text-[#00F2FE]"
          >
            @{tag}
          </Link>
        ) : (
          <span className="block text-xs text-[#14B8A6] font-medium mb-1 truncate">
            @{tag}
          </span>
        ))}

      {text ? <span className="whitespace-pre-wrap">{text}</span> : null}

      {method && offer && (
        <button
          type="button"
          onClick={() => {
            if (canOpen) setSheetOpen(true)
          }}
          disabled={!canOpen}
          title={
            canOpen
              ? 'Open payment details'
              : 'Payment details not set yet — Mark needs to add his handle.'
          }
          className={`mt-2 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide border transition-colors ${
            canOpen
              ? 'bg-[#14B8A6]/25 border-[#14B8A6] text-[#00F2FE] hover:bg-[#14B8A6]/40 cursor-pointer'
              : 'bg-[#18181B] border-[#3F3F46] text-[#71717A] cursor-default'
          } ${text ? '' : 'mt-0'}`}
        >
          {paymentPillLabel(offer)}
          {canOpen ? ' →' : ''}
        </button>
      )}

      {sheetOpen && method && handle && (
        <PaymentDetailSheet
          method={method}
          handle={handle}
          offer={offer}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </span>
  )
}
