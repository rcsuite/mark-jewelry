'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ContactModal from '@/components/chat/ContactModal'

export type ContactOpenOptions = {
  pieceId?: string | null
  pieceTitle?: string | null
  /** e.g. "Boulder Opal Pendant" — shown to Mark as viewing context */
  viewingContext?: string | null
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

export function ContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ContactOpenOptions>({})
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const openContact = useCallback((next?: ContactOpenOptions) => {
    setOpts(next ?? {})
    setOpen(true)
  }, [])

  const closeContact = useCallback(() => {
    setOpen(false)
  }, [])

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
          }}
          onEmailSent={() => {
            closeContact()
          }}
        />
      )}
    </ContactContext.Provider>
  )
}
