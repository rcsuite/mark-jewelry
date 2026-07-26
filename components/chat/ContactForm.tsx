'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startChat } from '@/lib/chat-actions'
import ChatWidget from '@/components/chat/ChatWidget'

type Props = {
  pieceId?: string | null
  pieceTitle?: string | null
}

export default function ContactForm({ pieceId, pieceTitle }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passcode, setPasscode] = useState('')
  const [mode, setMode] = useState<'live' | 'email_only'>('live')
  const [message, setMessage] = useState(
    pieceTitle ? `I'd like to inquire about: ${pieceTitle}` : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [openWidget, setOpenWidget] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      setError(null)
      setStatus(null)
      const result = await startChat({
        name,
        email,
        passcode,
        mode,
        message: mode === 'email_only' ? message : message || undefined,
        pieceId,
        pieceTitle,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.data?.mode === 'email_only') {
        setStatus('Message sent to Mark. He’ll reply by email.')
        setMessage('')
        return
      }
      setOpenWidget(true)
      setStatus('Live chat unlocked — ask Mark anything below.')
      router.refresh()
    })
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
        <h1 className="display-font text-4xl mt-6 mb-2">Contact Mark</h1>
        <p className="text-[#A1A1AA] text-sm mb-8">
          Reach the forge directly. Live chat stays on this site; or send a one-shot email.
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
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              Your name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54]"
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
              <span className="block text-[11px] text-[#71717A] mt-2">
                Come back later with the same email + password to open this conversation again.
              </span>
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
              {mode === 'email_only' ? 'Your message' : 'First question (optional)'}
            </span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 outline-none focus:border-[#B59A54] resize-none"
              placeholder={
                mode === 'email_only'
                  ? 'What should Mark know?'
                  : 'What do you want to ask Mark?'
              }
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
        </div>
      </div>

      <ChatWidget initiallyOpen={openWidget} />
    </div>
  )
}
