'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  clearVisitorChatSession,
  fetchVisitorChat,
  sendVisitorMessage,
} from '@/lib/chat-actions'
import type { ChatMessage } from '@/lib/chat-types'

type Props = {
  /** Open the panel on mount (after contact form submit). */
  initiallyOpen?: boolean
}

export default function ChatWidget({ initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen)
  const [hasSession, setHasSession] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [visitorName, setVisitorName] = useState('')
  const [pieceTitle, setPieceTitle] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const emptyPromptShown = messages.length === 0

  const load = () => {
    startTransition(async () => {
      const result = await fetchVisitorChat()
      if (!result.ok) {
        setError(result.error)
        setHasSession(false)
        return
      }
      if (!result.data) {
        setHasSession(false)
        setMessages([])
        return
      }
      setHasSession(true)
      setVisitorName(result.data.thread.visitor_name)
      setPieceTitle(result.data.thread.piece_title)
      setMessages(result.data.messages)
      setError(null)
    })
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, 4000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initiallyOpen) setOpen(true)
  }, [initiallyOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!hasSession && !open) return null

  const send = () => {
    const body = draft.trim()
    if (!body) return
    startTransition(async () => {
      const result = await sendVisitorMessage(body)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft('')
      setMessages((prev) => [...prev, result.data!.message])
      setError(null)
    })
  }

  const signOutChat = () => {
    startTransition(async () => {
      await clearVisitorChatSession()
      setHasSession(false)
      setMessages([])
      setOpen(false)
    })
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      {open && hasSession && (
        <div className="w-[min(100vw-2rem,22rem)] h-[28rem] bg-[#0A0C10] border border-[#27272A] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#27272A] flex items-start justify-between gap-2 bg-[#05070A]">
            <div>
              <p className="display-font text-sm text-white">Ask Mark a question</p>
              <p className="text-[10px] text-[#71717A] uppercase tracking-widest mt-0.5">
                {visitorName}
                {pieceTitle ? ` · ${pieceTitle}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#71717A] hover:text-white text-xl leading-none"
              aria-label="Minimize chat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {emptyPromptShown && (
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                What do you want to ask Mark? Hit enter to send — he’ll get an email for this first
                message, then you can keep chatting here.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] text-sm px-3 py-2 rounded-sm ${
                  m.sender === 'visitor'
                    ? 'ml-auto bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-white'
                    : 'mr-auto bg-[#18181B] border border-[#27272A] text-[#E4E4E7]'
                }`}
              >
                {m.body}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-3 text-xs text-red-400">{error}</p>}

          <div className="p-3 border-t border-[#27272A] flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Type a message…"
              className="flex-1 bg-[#05070A] border border-[#27272A] px-3 py-2 text-sm text-white outline-none focus:border-[#14B8A6]"
            />
            <button
              type="button"
              onClick={send}
              disabled={pending || !draft.trim()}
              className="px-3 py-2 bg-[#14B8A6] text-black text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <button
            type="button"
            onClick={signOutChat}
            className="text-[9px] uppercase tracking-widest text-[#52525B] hover:text-[#A1A1AA] py-2"
          >
            End chat on this device
          </button>
        </div>
      )}

      {hasSession && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-[#14B8A6] text-black shadow-lg shadow-[#14B8A6]/20 flex items-center justify-center hover:bg-[#00F2FE] transition-colors"
          aria-label={open ? 'Close chat' : 'Open chat'}
        >
          <span className="display-font text-lg">{open ? '×' : '💬'}</span>
        </button>
      )}
    </div>
  )
}
