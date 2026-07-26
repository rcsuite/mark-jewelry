'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ContactModal from '@/components/chat/ContactModal'
import { focusChatAboutPiece } from '@/lib/chat-actions'

export type ContactOpenOptions = {
  pieceId?: string | null
  pieceTitle?: string | null
  /** e.g. "Boulder Opal Pendant" — shown to Mark as viewing context */
  viewingContext?: string | null
}

export const CHAT_FOCUS_EVENT = 'emd-chat-focus'

export type ChatFocusDetail = {
  pieceId?: string | null
  pieceTitle?: string | null
}

type ContactContextValue = {
  openContact: (opts?: ContactOpenOptions) => void
  closeContact: () => void
}

const ContactContext = createContext<ContactContextValue | null>(null)

export function useContact() {
  const ctx = useContext(ContactContext)
  if (!ctx) {
    throw new Error('useContact must be used within ContactProvider')
  }
  return ctx
}

/** Safe hook when provider might be absent (admin pages). */
export function useContactOptional() {
  return useContext(ContactContext)
}

export function dispatchChatFocus(detail: ChatFocusDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CHAT_FOCUS_EVENT, { detail }))
}

export function ContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ContactOpenOptions>({})
  const [, startTransition] = useTransition()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const closeContact = useCallback(() => {
    setOpen(false)
  }, [])

  const openContact = useCallback(
    (next?: ContactOpenOptions) => {
      const pieceId = next?.pieceId
      const pieceTitle = next?.pieceTitle ?? next?.viewingContext

      // Piece inquire: if already chatting, jump straight to the side panel.
      if (pieceId || pieceTitle) {
        startTransition(async () => {
          const result = await focusChatAboutPiece({ pieceId, pieceTitle })
          if (result.ok && result.data?.hasSession) {
            dispatchChatFocus({ pieceId, pieceTitle })
            setOpen(false)
            return
          }
          setOpts({
            pieceId,
            pieceTitle,
            viewingContext: next?.viewingContext ?? pieceTitle,
          })
          setOpen(true)
        })
        return
      }

      setOpts(next ?? {})
      setOpen(true)
    },
    [startTransition]
  )

  // Deep links: /shop?contact=1&piece=… or /?contact=1
  useEffect(() => {
    if (searchParams.get('contact') !== '1') return
    const pieceId = searchParams.get('piece')
    const pieceTitle = searchParams.get('title')
    openContact({
      pieceId,
      pieceTitle,
      viewingContext: pieceTitle,
    })
    const params = new URLSearchParams(searchParams.toString())
    params.delete('contact')
    params.delete('piece')
    params.delete('title')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, pathname, router, openContact])

  const value = useMemo(
    () => ({ openContact, closeContact }),
    [openContact, closeContact]
  )

  return (
    <ContactContext.Provider value={value}>
      {children}
      {open && (
        <ContactModal
          pieceId={opts.pieceId}
          pieceTitle={opts.pieceTitle}
          viewingContext={opts.viewingContext ?? opts.pieceTitle}
          onClose={closeContact}
          onLiveChatStarted={() => {
            closeContact()
            dispatchChatFocus({
              pieceId: opts.pieceId,
              pieceTitle: opts.pieceTitle,
            })
          }}
          onEmailSent={() => {
            closeContact()
          }}
        />
      )}
    </ContactContext.Provider>
  )
}
