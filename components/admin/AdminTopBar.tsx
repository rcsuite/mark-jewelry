'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { countUnreadForMark } from '@/lib/chat-actions'
import type { SilverQuote } from '@/lib/silver'
import AdminSilverStrip from '@/components/admin/AdminSilverStrip'

const FUTURES_URL = 'https://www.google.com/search?q=COMEX+silver+futures+SI%3DF'

type Props = {
  silver: SilverQuote | null
  initialUnread: number
}

export default function AdminTopBar({ silver, initialUnread }: Props) {
  const [unread, setUnread] = useState(initialUnread)
  const [gearOpen, setGearOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const gearRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const id = window.setInterval(() => {
      void countUnreadForMark().then((n) => setUnread(n))
    }, 5000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!gearRef.current?.contains(e.target as Node)) setGearOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="sticky top-0 z-[70] bg-[#0A0C10]/95 border-b border-[#27272A] backdrop-blur-sm">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-4">
        <Link
          href="/admin"
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A] hover:text-[#14B8A6] whitespace-nowrap"
        >
          {pathname === '/admin' ? 'Admin' : '← Panel'}
        </Link>

        <div className="min-w-0 flex justify-center">
          <AdminSilverStrip quote={silver} futuresUrl={FUTURES_URL} />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 justify-end">
          <Link
            href="/admin/messages"
            className={`relative w-10 h-10 flex items-center justify-center border transition-colors ${
              unread > 0
                ? 'border-red-500 text-red-500 bg-red-950/40'
                : 'border-[#27272A] text-[#A1A1AA] hover:border-[#14B8A6] hover:text-white'
            }`}
            aria-label={unread > 0 ? `${unread} unread messages` : 'Messages'}
            title="Messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6h16v12H4V6zm0 0l8 7 8-7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <div className="relative" ref={gearRef}>
            <button
              type="button"
              onClick={() => setGearOpen((v) => !v)}
              className="w-10 h-10 flex items-center justify-center border border-[#27272A] text-[#A1A1AA] hover:border-[#14B8A6] hover:text-white"
              aria-label="Settings"
              aria-expanded={gearOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M19.4 13a7.6 7.6 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3h-6l-.4 2.5a7.7 7.7 0 0 0-1.7 1L4.5 5.5l-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 1.7 1L9 21h6l.4-2.5a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {gearOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#0A0C10] border border-[#27272A] shadow-xl z-50">
                <Link
                  href="/"
                  className="block px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-[#A1A1AA] hover:bg-[#14B8A6]/10 hover:text-white"
                  onClick={() => setGearOpen(false)}
                >
                  Public site
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="w-full text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
