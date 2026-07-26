import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensure the browser has a live authenticated session before Storage uploads.
 * Expired access tokens + Storage RLS = silent upload failure; never fall back
 * to saving a blob: preview URL.
 */
export async function ensureAuthenticatedSession(supabase: SupabaseClient): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(`Auth check failed: ${sessionError.message}`)
  }

  if (!session) {
    throw new Error('Your login expired. Open /login, sign in once, then try the upload again.')
  }

  // Proactively refresh so Storage gets a fresh JWT (important for PWA / idle tabs).
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed.session) {
    throw new Error(
      'Could not refresh your login. Sign in again at /login — Storage uploads need an active session.'
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Your login expired. Sign in again at /login, then retry the upload.')
  }
}

/** True only for durable http(s) URLs — never blob: or data: previews. */
export function isPersistentImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (/^(blob:|data:)/i.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function assertPersistentImageUrls(urls: string[], label = 'photos'): void {
  const bad = urls.filter((u) => u.trim() !== '' && !isPersistentImageUrl(u))
  if (bad.length > 0) {
    throw new Error(
      `${label} must be Storage URLs, not temporary browser previews (blob:). Crop & upload again.`
    )
  }
}
