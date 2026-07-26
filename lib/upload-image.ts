import type { SupabaseClient } from '@supabase/supabase-js'

export const FORGE_IMAGES_BUCKET = 'forge-images'
export const SHOP_INVENTORY_BUCKET = 'shop-inventory'

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

/** Upload a cropped image blob and return its public Storage URL. */
export async function uploadImageBlob(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
  blob: Blob,
  fileStem?: string
): Promise<string> {
  const ext = extensionForMime(blob.type || 'image/jpeg')
  const stem = fileStem ?? `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const path = `${folder.replace(/\/$/, '')}/${stem}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
