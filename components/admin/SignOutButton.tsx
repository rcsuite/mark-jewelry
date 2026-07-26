'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Ends the admin session on this device and sends Mark to /login.
 * Use "Sign out everywhere" only when you need to kill every device at once.
 */
export default function SignOutButton({
  className = '',
  everywhere = false,
}: {
  className?: string
  everywhere?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    if (everywhere) {
      const ok = confirm(
        'Sign out on EVERY device (phone, home computer, etc.)? You will need to log in again on each one.'
      )
      if (!ok) return
    }

    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={
        className ||
        'text-[10px] font-bold tracking-widest uppercase border border-[#27272A] text-[#A1A1AA] hover:border-red-800 hover:text-red-400 px-4 py-2.5 transition-colors disabled:opacity-50'
      }
    >
      {busy ? 'Signing out…' : everywhere ? 'Sign out everywhere' : 'Sign out'}
    </button>
  )
}
