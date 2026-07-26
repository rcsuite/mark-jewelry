'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Keeps Mark's admin session alive on phones / homescreen PWAs.
 * Mobile browsers throttle timers in the background; refresh when the app
 * becomes visible again so Storage uploads still have a valid JWT.
 */
export default function AuthSessionKeeper() {
  useEffect(() => {
    const supabase = createClient()

    const sync = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh()
        void supabase.auth.getUser()
      } else {
        void supabase.auth.stopAutoRefresh()
      }
    }

    sync()
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Cookie jar updates when tokens rotate — no UI needed.
    })

    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
      sub.subscription.unsubscribe()
      void supabase.auth.stopAutoRefresh()
    }
  }, [])

  return null
}
