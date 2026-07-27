'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { startChat } from '@/lib/chat-actions'
import { withPieceTag } from '@/lib/chat-format'

type Props = {
  pieceId?: string | null
  pieceTitle?: string | null
  viewingContext?: string | null
  onClose: () => void
  onLiveChatStarted: () => void
  onEmailSent: () => void
}

export default function ContactModal({
  pieceId,
  pieceTitle,
  viewingContext,
  onClose,
  onLiveChatStarted,
  onEmailSent,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passcode, setPasscode] = useState('')
  const [mode, setMode] = useState<'live' | 'email_only'>('live')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    startTransition(async () => {
      setError(null)
      const ctx =
        viewingContext ||
        (pieceTitle ? pieceTitle : null)
      const tagged = withPieceTag(message, pieceTitle)

      const result = await startChat({
        name,
        email,
        passcode,
        mode,
        message: mode === 'email_only' ? tagged : tagged || undefined,
        pieceId,
        pieceTitle,
        viewingContext: ctx,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.data?.mode === 'email_only') {
        onEmailSent()
        return
      }
      onLiveChatStarted()
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        aria-label="Close contact"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full sm:max-w-md bg-[#0A0C10] border border-[#27272A] shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="contact-modal-title" className="display-font text-2xl text-white">
                Contact Mark
              </h2>
              <p className="text-[#71717A] text-sm mt-1">
                Stay on this page — submit and keep shopping.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#71717A] hover:text-white text-2xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {pieceTitle && (
            <div className="border border-[#B59A54]/40 bg-[#B59A54]/10 px-3 py-2 text-sm text-[#E7D7A4]">
              Viewing <span className="font-semibold text-white">{pieceTitle}</span>
            </div>
          )}

          {error && (
            <div className="border border-red-900/50 bg-red-950/30 text-red-300 p-3 text-sm">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Your name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54]"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`p-3 border text-[10px] font-bold uppercase tracking-widest ${
                mode === 'live'
                  ? 'border-[#14B8A6] bg-[#14B8A6]/15 text-white'
                  : 'border-[#27272A] text-[#71717A]'
              }`}
            >
              Live chat
            </button>
            <button
              type="button"
              onClick={() => setMode('email_only')}
              className={`p-3 border text-[10px] font-bold uppercase tracking-widest ${
                mode === 'email_only'
                  ? 'border-[#14B8A6] bg-[#14B8A6]/15 text-white'
                  : 'border-[#27272A] text-[#71717A]'
              }`}
            >
              Email Mark
            </button>
          </div>

          {mode === 'live' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                Create a password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54]"
                placeholder="At least 6 characters"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              {mode === 'email_only' ? 'Your message' : 'First question (optional)'}
            </span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54] resize-none"
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="w-full py-4 bg-[#B59A54] text-black display-font tracking-widest disabled:opacity-50"
          >
            {pending ? 'Connecting…' : mode === 'live' ? 'Start live chat' : 'Send to Mark'}
          </button>

          <p className="text-center text-[11px] text-[#52525B]">
            Prefer the full story?{' '}
            <Link href="/mark" className="text-[#14B8A6] hover:text-white" onClick={onClose}>
              Know Mark
            </Link>
          </p>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />
    </div>
  )
}
