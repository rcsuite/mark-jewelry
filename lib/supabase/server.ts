import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_MAX_AGE, authCookieOptions } from '@/lib/supabase/cookie-options'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...authCookieOptions,
                ...options,
                maxAge: options?.maxAge ?? AUTH_COOKIE_MAX_AGE,
              })
            )
          } catch {
            // Called from a Server Component — safe to ignore when the
            // Proxy is already refreshing the session.
          }
        },
      },
    }
  )
}
