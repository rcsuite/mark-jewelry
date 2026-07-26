import { createClient } from '@/lib/supabase/server'
import type { Category, CurrentBuild, HeroSlide, ShopPiece, VideoSession } from '@/lib/types'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getCategories:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    short_name: String(row.short_name || row.title),
    description: String(row.description ?? ''),
    image_url: row.image_url ?? null,
    sort_order: Number(row.sort_order ?? 0),
    show_on_homepage: Boolean(row.show_on_homepage),
  }))
}

function normalizePiece(row: Record<string, unknown>): ShopPiece {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    category: String(row.category ?? ''),
    piece_type: String(row.piece_type ?? ''),
    price: Number(row.price ?? 0),
    photos: Array.isArray(row.photos)
      ? row.photos.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
      : [],
    description: (row.description as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    specs: (row.specs as ShopPiece['specs']) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  }
}

function normalizeVideos(raw: unknown): VideoSession[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((v): v is VideoSession => {
      if (!v || typeof v !== 'object') return false
      const url = (v as { url?: unknown }).url
      return typeof url === 'string' && url.trim() !== ''
    })
    .map((v) => ({
      id: Number((v as VideoSession).id) || Date.now(),
      title: String((v as VideoSession).title || 'SESSION'),
      date: String((v as VideoSession).date || ''),
      url: String((v as VideoSession).url),
    }))
}

export async function getCurrentBuild(): Promise<CurrentBuild | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('current_build')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getCurrentBuild:', error.message)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    status: data.status,
    hero_image: data.hero_image,
    progress_images: Array.isArray(data.progress_images)
      ? data.progress_images.filter((p: string) => typeof p === 'string' && p.trim() !== '')
      : [],
    description: data.description,
    video_archive: normalizeVideos(data.video_archive),
    updated_at: data.updated_at,
  }
}

export async function getShopInventory(): Promise<ShopPiece[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shop_inventory')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getShopInventory:', error.message)
    return []
  }

  return (data ?? []).map((row) => normalizePiece(row as Record<string, unknown>))
}

/** Homepage preview: newest available pieces. */
export async function getFeaturedInventory(limit = 4): Promise<ShopPiece[]> {
  const inventory = await getShopInventory()
  return inventory.slice(0, limit)
}

export function isBuildActive(build: CurrentBuild | null): boolean {
  return Boolean(build && build.status === 'active' && build.progress_images.length > 0)
}

export function buildHeroSlides(build: CurrentBuild | null): HeroSlide[] {
  if (!isBuildActive(build) || !build) {
    return [{ url: '/banner2.png', label: 'AWAITING NEXT IGNITION' }]
  }

  const progress = build.progress_images
  const mostRecent = progress[progress.length - 1]
  const sequence: HeroSlide[] = [
    { url: '/banner2.png', label: 'LIVE FROM THE WORKBENCH' },
    { url: mostRecent, label: 'LATEST UPDATE' },
  ]

  progress.forEach((imgUrl, i) => {
    let label = 'IN PROGRESS'
    if (i === 0 || i === progress.length - 1) label = 'LIVE FROM THE WORKBENCH'
    sequence.push({ url: imgUrl, label })
  })

  return sequence
}
