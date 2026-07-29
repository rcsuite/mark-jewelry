'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPartner } from '@/lib/actions'
import type { Partner } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  /** Called after a successful create — use to select the new partner on a piece. */
  onCreated?: (partner: Partner) => void
}

export default function PartnershipModal({ open, onClose, onCreated }: Props) {
  const [creditLabel, setCreditLabel] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setCreditLabel('')
    setName('')
    setUrl('')
    setError(null)
  }, [open])

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
      const result = await createPartner({
        credit_label: creditLabel,
        name,
        url: url.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onCreated?.(result.data!)
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
        aria-labelledby="partnership-modal-title"
        className="relative w-full max-w-md bg-[#0A0C10] border border-[#27272A] p-8 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
        <h2 id="partnership-modal-title" className="display-font text-2xl text-white mb-2">
          Add partnership
        </h2>
        <p className="text-[#71717A] text-xs mb-6 leading-relaxed">
          Credit someone who helped on a piece. You can attach them when editing specs; visitors
          see it on the piece page.
        </p>

        {error && (
          <div className="mb-4 border border-red-900/50 bg-red-950/30 text-red-300 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Credit label
            </span>
            <input
              value={creditLabel}
              onChange={(e) => setCreditLabel(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              placeholder="Stones Cut By"
              autoFocus
            />
            <span className="block text-[11px] text-[#52525B] mt-2">
              Example: Stones Cut By — shown before their name on the piece page.
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              placeholder="Partner name"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Website or social
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] font-mono text-xs"
              placeholder="Copy and paste web link here"
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
            {pending ? 'Saving…' : 'Save partner'}
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
