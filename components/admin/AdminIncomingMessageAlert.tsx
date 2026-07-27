'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  peekUnreadAlert,
  processChatEmailReminders,
  type UnreadAlert,
} from '@/lib/chat-actions'

/**
 * Polls for new visitor messages while Mark is anywhere in /admin.
 * Also runs the 2-minute email reminder claim so emails fire even without Vercel cron.
 */
export default function AdminIncomingMessageAlert({
  initialUnread,
}: {
  initialUnread: number
}) {
  const [alert, setAlert] = useState<UnreadAlert | null>(null)
  const [dismissedThread, setDismissedThread] = useState<string | null>(null)
  const prevUnread = useRef(initialUnread)

  useEffect(() => {
    const tick = async () => {
      void processChatEmailReminders()
      const next = await peekUnreadAlert()
      if (next.unreadCount > prevUnread.current && next.threadId) {
        if (dismissedThread !== next.threadId) {
          setAlert(next)
        }
      }
      if (next.unreadCount === 0) {
        setAlert(null)
        setDismissedThread(null)
      }
      prevUnread.current = next.unreadCount
    }

    void tick()
    const id = window.setInterval(tick, 5000)
    return () => window.clearInterval(id)
  }, [dismissedThread])

  if (!alert || !alert.threadId) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-[#0A0C10] border-2 border-red-500 shadow-2xl shadow-red-900/40 p-5">
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-red-400 mb-2">
          New message
        </p>
        <p className="display-font text-xl text-white mb-1">
          {alert.visitorName || 'Visitor'}
        </p>
        {alert.pieceTitle && (
          <p className="text-xs text-[#B59A54] mb-2">
            Inquired while viewing “{alert.pieceTitle}”
          </p>
        )}
        {alert.preview && (
          <p className="text-sm text-[#A1A1AA] line-clamp-3 mb-4 border-l-2 border-[#27272A] pl-3">
            {alert.preview}
          </p>
        )}
        <div className="flex gap-2">
          <Link
            href="/admin/messages"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-3 bg-red-500 text-white text-[10px] font-bold tracking-widest uppercase"
            onClick={() => setAlert(null)}
          >
            Open messages
          </Link>
          <button
            type="button"
            onClick={() => {
              setDismissedThread(alert.threadId)
              setAlert(null)
            }}
            className="px-4 py-3 border border-[#27272A] text-[10px] font-bold tracking-widest uppercase text-[#A1A1AA]"
          >
            Later
          </button>
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
