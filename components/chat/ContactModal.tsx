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

type Gate = 'new' | 'continue'
type Mode = 'live' | 'email_only'

const tabClass = (active: boolean) =>
  `p-3 border text-[10px] font-bold uppercase tracking-widest transition-colors ${
    active
      ? 'border-[#14B8A6] bg-[#14B8A6] text-black'
      : 'border-[#B59A54]/60 bg-[#B59A54]/25 text-[#E7D7A4] hover:bg-[#B59A54]/40'
  }`

const fieldClass =
  'mt-2 w-full bg-[#18181B] border border-[#3F3F46] p-3 text-white caret-[#14B8A6] placeholder:text-[#71717A] outline-none focus:border-[#14B8A6]'

export default function ContactModal({
  pieceId,
  pieceTitle,
  viewingContext,
  onClose,
  onLiveChatStarted,
  onEmailSent,
}: Props) {
  const [gate, setGate] = useState<Gate>('new')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<Mode>('live')
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
      const ctx = viewingContext || (pieceTitle ? pieceTitle : null)
      const tagged = withPieceTag(message, pieceTitle, pieceId)

      if (gate === 'continue') {
        const result = await startChat({
          email,
          mode: 'live',
          pieceId,
          pieceTitle,
          viewingContext: ctx,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        onLiveChatStarted()
        return
      }

      const result = await startChat({
        name,
        email,
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

  const buttonLabel = (() => {
    if (pending) return 'Connecting…'
    if (gate === 'continue') return 'Open my chat'
    return mode === 'live' ? 'Start live chat' : 'Send to Mark'
  })()

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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setGate('new')
                setError(null)
              }}
              className={tabClass(gate === 'new')}
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => {
                setGate('continue')
                setMode('live')
                setError(null)
              }}
              className={tabClass(gate === 'continue')}
            >
              Continue chat
            </button>
          </div>

          {gate === 'new' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                Your name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
                autoFocus
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              autoFocus={gate === 'continue'}
              autoComplete="email"
              placeholder="you@example.com"
            />
            <span className="block text-[11px] text-[#A1A1AA] mt-2">
              Same email always reopens your conversation with Mark — no password.
            </span>
          </label>

          {gate === 'new' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={tabClass(mode === 'live')}
              >
                Live chat
              </button>
              <button
                type="button"
                onClick={() => setMode('email_only')}
                className={tabClass(mode === 'email_only')}
              >
                Email Mark
              </button>
            </div>
          )}

          {gate === 'new' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                {mode === 'email_only' ? 'Your message' : 'First question (optional)'}
              </span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none`}
              />
            </label>
          )}

          {gate === 'continue' && (
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
              Enter the email you used before. We’ll open that thread.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="w-full py-4 bg-[#B59A54] text-black display-font tracking-widest disabled:opacity-50"
          >
            {buttonLabel}
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
