'use client'

import { usePathname } from 'next/navigation'
import ChatWidget from '@/components/chat/ChatWidget'
import type { PaymentHandles } from '@/lib/types'

/** Floating chat on public pages when a visitor session cookie exists. */
export default function PublicChatMount({
  paymentHandles,
}: {
  paymentHandles: PaymentHandles
}) {
  const pathname = usePathname()
  if (!pathname) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null
  }
  return <ChatWidget paymentHandles={paymentHandles} />
}
