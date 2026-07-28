import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureAuthenticatedSession, isPersistentImageUrl } from '@/lib/auth-session'

export const FORGE_IMAGES_BUCKET = 'forge-images'
export const SHOP_INVENTORY_BUCKET = 'shop-inventory'
export const REVIEW_PHOTOS_BUCKET = 'review-photos'

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

/**
 * Upload a cropped image blob and return its public Storage URL.
 * Refreshes the auth session first — Storage RLS requires `authenticated`.
 */
export async function uploadImageBlob(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
  blob: Blob,
  fileStem?: string
): Promise<string> {
  await ensureAuthenticatedSession(supabase)

  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('Crop produced an empty image. Try again.')
  }

  const ext = extensionForMime(blob.type || 'image/jpeg')
  const stem = fileStem ?? `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const path = `${folder.replace(/\/$/, '')}/${stem}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    const hint =
      /row-level security|not authenticated|jwt|unauthorized/i.test(error.message)
        ? ' Sign in again at /login — the upload needs an active admin session.'
        : ''
    throw new Error(`Storage upload failed: ${error.message}.${hint}`)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = data.publicUrl

  if (!isPersistentImageUrl(publicUrl)) {
    throw new Error('Upload returned an invalid URL. Nothing was saved — try again.')
  }

  return publicUrl
}
