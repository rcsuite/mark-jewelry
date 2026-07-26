'use client'

import { usePathname } from 'next/navigation'
import ChatWidget from '@/components/chat/ChatWidget'

/** Floating chat on public pages when a visitor session cookie exists. */
export default function PublicChatMount() {
  const pathname = usePathname()
  if (!pathname) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null
  }
  return <ChatWidget />
}
