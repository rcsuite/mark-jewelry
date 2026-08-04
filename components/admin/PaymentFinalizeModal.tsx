'use client'

import { useEffect, useState } from 'react'
import type { PaymentMethod } from '@/lib/types'
import {
  formatOfferAmount,
  paymentMethodLabel,
  type PaymentOffer,
} from '@/lib/chat-format'

export type PaymentFinalizeDefaults = {
  title: string
  amount: string
  note: string
}

type Props = {
  method: PaymentMethod
  defaults: PaymentFinalizeDefaults
  onDone: (offer: PaymentOffer) => void
  onCancel: () => void
}

export default function PaymentFinalizeModal({
  method,
  defaults,
  onDone,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(defaults.title)
  const [amount, setAmount] = useState(defaults.amount)
  const [note, setNote] = useState(defaults.note)
  const label = paymentMethodLabel(method)
  const preview = formatOfferAmount(amount)

  useEffect(() => {
    setTitle(defaults.title)
    setAmount(defaults.amount)
    setNote(defaults.note)
  }, [defaults.title, defaults.amount, defaults.note, method])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = () => {
    onDone({
      method,
      title: title.trim(),
      amount: amount.trim().replace(/^\$/, ''),
      note: note.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Cancel"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-finalize-title"
        className="relative w-full max-w-md bg-[#0A0C10] border border-[#27272A] p-6 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
        <h2 id="payment-finalize-title" className="display-font text-2xl text-white mb-1">
          Finalize {label} info
        </h2>
        <p className="text-[#71717A] text-xs mb-6 leading-relaxed">
          Adjust the piece name or price (e.g. take $5 off), then Done. The payment pill loads into
          your reply — add a note if you want, then Send.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Piece name
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#14B8A6]"
              placeholder="Piece name"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Amount due
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[#71717A] text-sm">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                className="flex-1 bg-[#05070A] border border-[#27272A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#14B8A6] font-mono"
                placeholder="0"
              />
            </div>
            {preview && (
              <p className="mt-1.5 text-[11px] text-[#B59A54]">Visitor will see {preview}</p>
            )}
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Note for buyer (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#14B8A6]"
              placeholder="e.g. $5 courtesy discount · includes shipping"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <button
            type="button"
            onClick={submit}
            className="px-6 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
