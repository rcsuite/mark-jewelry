'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  getAdminThread,
  listChatThreads,
  sendMarkReply,
  touchMarkPresence,
} from '@/lib/chat-actions'
import type { ChatMessage, ChatThreadSummary } from '@/lib/chat-types'

export default function AdminMessagesInbox({
  initialThreads,
}: {
  initialThreads: ChatThreadSummary[]
}) {
  const [threads, setThreads] = useState(initialThreads)
  const [activeId, setActiveId] = useState<string | null>(initialThreads[0]?.id ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [active, setActive] = useState<ChatThreadSummary | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastPresenceRef = useRef(0)

  const pulsePresence = () => {
    const now = Date.now()
    if (now - lastPresenceRef.current < 10000) return
    lastPresenceRef.current = now
    void touchMarkPresence()
  }

  useEffect(() => {
    void touchMarkPresence()
    const onActivity = () => pulsePresence()
    window.addEventListener('keydown', onActivity)
    window.addEventListener('pointerdown', onActivity)
    return () => {
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('pointerdown', onActivity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadThread = (id: string) => {
    startTransition(async () => {
      const result = await getAdminThread(id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setActive(result.data!.thread)
      setMessages(result.data!.messages)
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, unread_for_mark: 0 } : t))
      )
      setError(null)
    })
  }

  useEffect(() => {
    if (activeId) loadThread(activeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const list = await listChatThreads()
        if (list.ok && list.data) setThreads(list.data)
        if (activeId) {
          const t = await getAdminThread(activeId)
          if (t.ok && t.data) {
            setMessages(t.data.messages)
            setActive(t.data.thread)
          }
        }
      })()
    }, 5000)
    return () => window.clearInterval(id)
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const reply = () => {
    if (!activeId || !draft.trim()) return
    startTransition(async () => {
      const result = await sendMarkReply(activeId, draft)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft('')
      setMessages((prev) => [...prev, result.data!.message])
    })
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <Link
          href="/admin"
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A] hover:text-[#14B8A6]"
        >
          ← Control panel
        </Link>
        <h1 className="display-font text-3xl mt-4 mb-6">Messages</h1>
        <p className="text-[#71717A] text-sm mb-6">
          Live chats from the site. First visitor message can email you; replies stay in-app so
          you aren’t spammed.
        </p>

        {error && (
          <div className="mb-4 border border-red-900/50 bg-red-950/30 text-red-300 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-[16rem_1fr] gap-4 border border-[#27272A] min-h-[28rem]">
          <aside className="border-b md:border-b-0 md:border-r border-[#27272A] max-h-[40vh] md:max-h-none overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-4 text-sm text-[#71717A]">No conversations yet.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[#27272A] hover:bg-[#14B8A6]/10 ${
                    activeId === t.id ? 'bg-[#14B8A6]/15' : ''
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-white truncate">{t.visitor_name}</span>
                    {t.unread_for_mark > 0 && (
                      <span className="text-[10px] bg-[#14B8A6] text-black px-1.5 py-0.5 font-bold">
                        {t.unread_for_mark}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#71717A] truncate mt-0.5">
                    {t.viewing_context || t.piece_title || t.visitor_email}
                  </p>
                </button>
              ))
            )}
          </aside>

          <section className="flex flex-col min-h-[24rem]">
            {active ? (
              <>
                <div className="px-4 py-3 border-b border-[#27272A]">
                  <p className="display-font text-lg">{active.visitor_name}</p>
                  <p className="text-[10px] text-[#71717A] uppercase tracking-widest">
                    {active.visitor_email}
                    {active.mode === 'email_only' ? ' · email' : ' · live'}
                  </p>
                  {(active.viewing_context || active.piece_title) && (
                    <p className="text-xs text-[#B59A54] mt-2">
                      Inquired while viewing “{active.viewing_context || active.piece_title}”
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] text-sm px-3 py-2 ${
                        m.sender === 'mark'
                          ? 'ml-auto bg-[#14B8A6]/20 border border-[#14B8A6]/40'
                          : 'mr-auto bg-[#18181B] border border-[#27272A]'
                      }`}
                    >
                      {m.body}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t border-[#27272A] flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      pulsePresence()
                    }}
                    onKeyDown={(e) => {
                      pulsePresence()
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        reply()
                      }
                    }}
                    placeholder="Reply to visitor…"
                    className="flex-1 bg-[#05070A] border border-[#27272A] px-3 py-2 text-sm outline-none focus:border-[#14B8A6]"
                  />
                  <button
                    type="button"
                    onClick={reply}
                    disabled={pending || !draft.trim()}
                    className="px-4 py-2 bg-[#B59A54] text-black text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <p className="p-8 text-[#71717A] text-sm">Select a conversation.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
