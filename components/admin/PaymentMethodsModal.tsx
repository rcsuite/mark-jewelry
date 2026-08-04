'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePaymentMethods } from '@/lib/actions'
import type { PaymentHandles } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  initialHandles: PaymentHandles
  onSaved?: (handles: PaymentHandles) => void
}

export default function PaymentMethodsModal({
  open,
  onClose,
  initialHandles,
  onSaved,
}: Props) {
  const router = useRouter()
  const [paypal, setPaypal] = useState(initialHandles.paypal_handle ?? '')
  const [zelle, setZelle] = useState(initialHandles.zelle_target ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setPaypal(initialHandles.paypal_handle ?? '')
    setZelle(initialHandles.zelle_target ?? '')
    setError(null)
  }, [open, initialHandles])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const save = () => {
    startTransition(async () => {
      const result = await updatePaymentMethods({
        paypal_handle: paypal,
        zelle_target: zelle,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const next: PaymentHandles = {
        paypal_handle: result.data!.paypal_handle,
        zelle_target: result.data!.zelle_target,
      }
      onSaved?.(next)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-methods-title"
        className="relative w-full max-w-md bg-[#0A0C10] border border-[#27272A] p-8 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
        <h2 id="payment-methods-title" className="display-font text-2xl text-white mb-2">
          Payment options
        </h2>
        <p className="text-[#71717A] text-xs mb-6 leading-relaxed">
          PayPal and Zelle only. When you send a payment pill in Messages, visitors see these
          details. Prefer a PayPal.me link or username so “Open PayPal” works.
        </p>

        {error && (
          <div className="mb-4 border border-red-900/50 bg-red-950/30 text-red-300 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              PayPal
            </span>
            <input
              value={paypal}
              onChange={(e) => setPaypal(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              placeholder="paypal.me/YourName or email"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Zelle
            </span>
            <input
              value={zelle}
              onChange={(e) => setZelle(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              placeholder="Email or phone"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="px-6 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
