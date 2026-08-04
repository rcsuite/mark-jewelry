'use client'

import { useEffect, useState } from 'react'
import type { PaymentTokenMethod, PaymentOffer } from '@/lib/chat-format'
import {
  formatOfferAmount,
  formatPaymentHandleDisplay,
  paymentDeepLink,
  paymentMethodLabel,
} from '@/lib/chat-format'

type Props = {
  method: PaymentTokenMethod
  handle: string
  offer?: PaymentOffer | null
  onClose: () => void
}

export default function PaymentDetailSheet({ method, handle, offer, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const display = formatPaymentHandleDisplay(method, handle)
  const deepLink = paymentDeepLink(method, handle, offer)
  const label = paymentMethodLabel(method)
  const amountLabel = formatOfferAmount(offer?.amount)
  const pieceTitle = offer?.title?.trim() || null
  const note = offer?.note?.trim() || null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-sheet-title"
        className="relative w-full max-w-sm bg-[#0A0C10] border border-[#27272A] p-6 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
        <h2 id="payment-sheet-title" className="display-font text-xl text-white mb-1">
          Pay with {label}
        </h2>
        <p className="text-[#71717A] text-xs mb-5 leading-relaxed">
          {method === 'zelle'
            ? 'Open your bank app and send via Zelle. Put the piece name in the memo.'
            : `Send payment in ${label}. Friends & family is fine for a purchase from Mark — put the piece name in the note.`}
        </p>

        {(pieceTitle || amountLabel) && (
          <div className="mb-5 border border-[#27272A] bg-[#05070A] px-3 py-3 space-y-1">
            {pieceTitle && (
              <p className="text-sm text-white font-medium leading-snug">{pieceTitle}</p>
            )}
            {amountLabel && (
              <p className="text-lg text-[#B59A54] font-mono">{amountLabel}</p>
            )}
            {note && <p className="text-xs text-[#A1A1AA] leading-relaxed pt-1">{note}</p>}
          </div>
        )}

        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6] mb-2">
          {method === 'zelle' ? 'Send to' : 'Handle'}
        </p>
        <p className="font-mono text-lg text-white mb-5 break-all">{display}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="px-4 py-2.5 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 border border-[#B59A54] text-[#B59A54] text-[10px] font-bold tracking-widest uppercase hover:bg-[#B59A54]/10"
            >
              Open {label}
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
