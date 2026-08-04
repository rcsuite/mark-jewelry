'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startChat } from '@/lib/chat-actions'
import { withPieceTag } from '@/lib/chat-format'
import type { PaymentHandles } from '@/lib/types'
import ChatWidget from '@/components/chat/ChatWidget'

type Props = {
  pieceId?: string | null
  pieceTitle?: string | null
  paymentHandles?: PaymentHandles | null
}

type Path = 'new' | 'continue' | 'email'

const tabClass = (active: boolean) =>
  `p-3 border text-[10px] font-bold uppercase tracking-widest transition-colors ${
    active
      ? 'border-[#14B8A6] bg-[#14B8A6] text-black'
      : 'border-[#B59A54]/60 bg-[#B59A54]/25 text-[#E7D7A4] hover:bg-[#B59A54]/40'
  }`

const fieldClass =
  'mt-2 w-full bg-[#18181B] border border-[#3F3F46] p-3 text-white caret-[#14B8A6] placeholder:text-[#71717A] outline-none focus:border-[#14B8A6]'

export default function ContactForm({
  pieceId,
  pieceTitle,
  paymentHandles = null,
}: Props) {
  const router = useRouter()
  const [path, setPath] = useState<Path>('new')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [openWidget, setOpenWidget] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      setError(null)
      setStatus(null)
      const tagged = withPieceTag(message, pieceTitle, pieceId)

      if (path === 'continue') {
        const result = await startChat({
          email,
          mode: 'live',
          pieceId,
          pieceTitle,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setOpenWidget(true)
        setStatus('Welcome back — your conversation is open below.')
        router.refresh()
        return
      }

      const mode = path === 'email' ? 'email_only' : 'live'
      const result = await startChat({
        name,
        email,
        mode,
        message: mode === 'email_only' ? tagged : tagged || undefined,
        pieceId,
        pieceTitle,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.data?.mode === 'email_only') {
        setStatus('Message sent. We’ll reply by email.')
        setMessage('')
        return
      }
      setOpenWidget(true)
      setStatus('Live chat unlocked — ask us anything below.')
      router.refresh()
    })
  }

  const buttonLabel = (() => {
    if (pending) return 'Connecting…'
    if (path === 'continue') return 'Open my chat'
    if (path === 'email') return 'Send to us'
    return 'Start live chat'
  })()

  const selectPath = (next: Path) => {
    setPath(next)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white font-sans antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />

      <div className="max-w-xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A] hover:text-[#14B8A6]"
        >
          ← Home
        </Link>
        <h1 className="display-font text-4xl mt-6 mb-2">Contact us</h1>
        <p className="text-[#A1A1AA] text-sm mb-8">
          Reach the forge directly. Live chat stays on this site; or send a one-shot email.
        </p>
        <p className="text-sm text-[#71717A] mb-8">
          New here?{' '}
          <Link href="/mark" className="text-[#14B8A6] hover:text-white">
            Meet Joeline &amp; Mark
          </Link>{' '}
          — fishing, family, life off the bench.
        </p>

        {pieceTitle && (
          <div className="mb-6 border border-[#B59A54]/40 bg-[#B59A54]/10 px-4 py-3 text-sm text-[#E7D7A4]">
            Inquiring about <span className="font-semibold text-white">{pieceTitle}</span>
          </div>
        )}

        {(error || status) && (
          <div
            className={`mb-6 border p-4 text-sm ${
              error
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="space-y-5 bg-[#0A0C10] border border-[#27272A] p-6">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => selectPath('new')} className={tabClass(path === 'new')}>
              New chat
            </button>
            <button
              type="button"
              onClick={() => selectPath('continue')}
              className={tabClass(path === 'continue')}
            >
              Continue chat
            </button>
            <button
              type="button"
              onClick={() => selectPath('email')}
              className={tabClass(path === 'email')}
            >
              Email us
            </button>
          </div>

          {path !== 'continue' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                Your name
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} autoComplete="name" />
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
              autoComplete="email"
              placeholder="you@example.com"
            />
            <span className="block text-[11px] text-[#A1A1AA] mt-2">
              Same email always reopens your conversation with us — no password.
            </span>
          </label>

          {path === 'new' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                First question (optional)
              </span>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none`}
                placeholder="What do you want to ask us?"
              />
            </label>
          )}

          {path === 'email' && (
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                Your message
              </span>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none`}
                placeholder="What should we know?"
              />
            </label>
          )}

          {path === 'continue' && (
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
        </div>
      </div>

      <ChatWidget initiallyOpen={openWidget} paymentHandles={paymentHandles} />
    </div>
  )
}
