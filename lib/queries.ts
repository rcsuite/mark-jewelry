import { createClient } from '@/lib/supabase/server'
import { resolveHeroBannerUrl } from '@/lib/hero'
import { normalizePieceMaker } from '@/lib/makers'
import { withLivePrice, withLivePrices } from '@/lib/pricing'
import { getSilverSpotPerOz } from '@/lib/silver'
import type {
  Category,
  CurrentBuild,
  ForgeArchive,
  HeroSlide,
  MarkMoment,
  Partner,
  Review,
  ShopPiece,
  SiteSettings,
  VideoSession,
} from '@/lib/types'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  handiworks_display_count: 4,
  sold_display_count: 12,
}

function clampDisplayCount(n: unknown, fallback: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(48, Math.max(1, Math.round(v)))
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('handiworks_display_count, sold_display_count')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('getSiteSettings:', error.message)
    return { ...DEFAULT_SITE_SETTINGS }
  }

  if (!data) return { ...DEFAULT_SITE_SETTINGS }

  return {
    handiworks_display_count: clampDisplayCount(
      data.handiworks_display_count,
      DEFAULT_SITE_SETTINGS.handiworks_display_count
    ),
    sold_display_count: clampDisplayCount(
      data.sold_display_count,
      DEFAULT_SITE_SETTINGS.sold_display_count
    ),
  }
}

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

  return (data ?? []).map((row) => toCategory(row as Record<string, unknown>))
}

export function toCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    short_name: String(row.short_name || row.title),
    description: String(row.description ?? ''),
    image_url: (row.image_url as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    show_on_homepage: Boolean(row.show_on_homepage),
  }
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function normalizePiece(row: Record<string, unknown>): ShopPiece {
  const primary = String(row.category ?? '')
  const categories = Array.isArray(row.categories)
    ? (row.categories as unknown[]).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    : primary
      ? [primary]
      : []

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    category: primary || categories[0] || '',
    categories: categories.length ? categories : primary ? [primary] : [],
    piece_type: String(row.piece_type ?? ''),
    price: Number(row.price ?? 0),
    material_cost: nullableNumber(row.material_cost),
    workmanship_cost: nullableNumber(row.workmanship_cost),
    silver_grams: nullableNumber(row.silver_grams),
    inquire_for_price: Boolean(row.inquire_for_price),
    manual_price: Boolean(row.manual_price),
    photos: Array.isArray(row.photos)
      ? row.photos.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
      : [],
    description: (row.description as string | null) ?? null,
    sold_note: (row.sold_note as string | null) ?? null,
    sold_at: (row.sold_at as string | null) ?? null,
    buyer_name: (row.buyer_name as string | null) ?? null,
    buyer_email: (row.buyer_email as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    specs: (row.specs as ShopPiece['specs']) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    sold: Boolean(row.sold),
    sort_order: Number(row.sort_order ?? 0),
    featured: Boolean(row.featured),
    featured_sort_order: Number(row.featured_sort_order ?? 0),
    made_by: normalizePieceMaker(row.made_by),
    partner_id: row.partner_id ? String(row.partner_id) : null,
  }
}

export function toPartner(row: Record<string, unknown>): Partner {
  return {
    id: String(row.id),
    credit_label: String(row.credit_label ?? ''),
    name: String(row.name ?? ''),
    url: (row.url as string | null)?.trim() || null,
    created_at: (row.created_at as string | null) ?? null,
  }
}

export async function getPartners(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getPartners:', error.message)
    return []
  }

  return (data ?? []).map((row) => toPartner(row as Record<string, unknown>))
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('partners').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('getPartnerById:', error.message)
    return null
  }
  if (!data) return null
  return toPartner(data as Record<string, unknown>)
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

export function toReview(row: Record<string, unknown>): Review {
  const status = row.status === 'pending' ? 'pending' : 'published'
  const source = row.source === 'invite' ? 'invite' : 'admin'
  return {
    id: String(row.id),
    quote: String(row.quote ?? ''),
    author: String(row.author ?? ''),
    location: String(row.location ?? ''),
    rating: Number(row.rating ?? 5),
    sort_order: Number(row.sort_order ?? 0),
    image_url: (row.image_url as string | null) ?? null,
    status,
    piece_id: row.piece_id ? String(row.piece_id) : null,
    invite_id: row.invite_id ? String(row.invite_id) : null,
    source,
    created_at: (row.created_at as string | null) ?? null,
  }
}

export function toMarkMoment(row: Record<string, unknown>): MarkMoment {
  return {
    id: String(row.id),
    image_url: String(row.image_url ?? ''),
    caption: String(row.caption ?? ''),
    sort_order: Number(row.sort_order ?? 0),
    created_at: (row.created_at as string | null) ?? null,
  }
}

export async function getMarkMoments(): Promise<MarkMoment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mark_moments')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getMarkMoments:', error.message)
    return []
  }

  return (data ?? []).map((row) => toMarkMoment(row as Record<string, unknown>))
}

/** Published reviews for the public homepage. */
export async function getReviews(): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getReviews:', error.message)
    return []
  }

  return (data ?? []).map((row) => toReview(row as Record<string, unknown>))
}

/** All reviews for admin (pending + published). */
export async function getAllReviews(): Promise<Review[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAllReviews:', error.message)
    return []
  }

  return (data ?? []).map((row) => toReview(row as Record<string, unknown>))
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

export function toForgeArchive(row: Record<string, unknown>): ForgeArchive {
  return {
    id: String(row.id),
    shop_piece_id: row.shop_piece_id ? String(row.shop_piece_id) : null,
    title: String(row.title ?? ''),
    thumbnail_url: String(row.thumbnail_url ?? ''),
    description: (row.description as string | null) ?? null,
    progress_images: Array.isArray(row.progress_images)
      ? (row.progress_images as unknown[]).filter(
          (p): p is string => typeof p === 'string' && p.trim() !== ''
        )
      : [],
    video_archive: normalizeVideos(row.video_archive),
    finalized_at: String(row.finalized_at ?? new Date().toISOString()),
    sort_order: Number(row.sort_order ?? 0),
  }
}

export async function getForgeArchives(): Promise<ForgeArchive[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forge_archives')
    .select('*')
    .order('sort_order', { ascending: false })
    .order('finalized_at', { ascending: false })

  if (error) {
    console.error('getForgeArchives:', error.message)
    return []
  }

  return (data ?? []).map((row) => toForgeArchive(row as Record<string, unknown>))
}

export async function getForgeArchiveById(id: string): Promise<ForgeArchive | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forge_archives')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getForgeArchiveById:', error.message)
    return null
  }

  return data ? toForgeArchive(data as Record<string, unknown>) : null
}

/** All pieces (admin). Ordered by sort_order. Live silver formula applied when spot is available. */
export async function getShopInventory(): Promise<ShopPiece[]> {
  const supabase = await createClient()
  const [{ data, error }, spot] = await Promise.all([
    supabase.from('shop_inventory').select('*').order('sort_order', { ascending: true }),
    getSilverSpotPerOz(),
  ])

  if (error) {
    console.error('getShopInventory:', error.message)
    return []
  }

  return withLivePrices(
    (data ?? []).map((row) => normalizePiece(row as Record<string, unknown>)),
    spot
  )
}

/** Public shop: available (not sold) pieces. */
export async function getAvailableInventory(): Promise<ShopPiece[]> {
  const pieces = await getShopInventory()
  return pieces.filter((p) => !p.sold)
}

/** Public vault: for-sale plus archived sold pieces (sold sorted after). */
export async function getVaultInventory(): Promise<ShopPiece[]> {
  const pieces = await getShopInventory()
  const available = pieces.filter((p) => !p.sold)
  const sold = pieces.filter((p) => p.sold)
  return [...available, ...sold]
}

export async function getPiecesByCategory(slug: string): Promise<ShopPiece[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shop_inventory')
    .select('*')
    .contains('categories', [slug])
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getPiecesByCategory:', error.message)
    // Fallback for rows not yet backfilled / older clients
    const fallback = await supabase
      .from('shop_inventory')
      .select('*')
      .eq('category', slug)
      .order('sort_order', { ascending: true })
    if (fallback.error) return []
    return (fallback.data ?? []).map((row) => normalizePiece(row as Record<string, unknown>))
  }

  return withLivePrices(
    (data ?? []).map((row) => normalizePiece(row as Record<string, unknown>)),
    await getSilverSpotPerOz()
  )
}

export async function getPieceById(id: string): Promise<ShopPiece | null> {
  const supabase = await createClient()
  const [{ data, error }, spot] = await Promise.all([
    supabase.from('shop_inventory').select('*').eq('id', id).maybeSingle(),
    getSilverSpotPerOz(),
  ])

  if (error) {
    console.error('getPieceById:', error.message)
    return null
  }

  return data ? withLivePrice(normalizePiece(data as Record<string, unknown>), spot) : null
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('getCategoryBySlug:', error.message)
    return null
  }

  return data ? toCategory(data as Record<string, unknown>) : null
}

/** Featured Available Handiworks (ordered). Pass limit for public homepage. */
export async function getFeaturedInventory(limit?: number): Promise<ShopPiece[]> {
  const supabase = await createClient()
  let query = supabase
    .from('shop_inventory')
    .select('*')
    .eq('featured', true)
    .eq('sold', false)
    .order('featured_sort_order', { ascending: true })

  if (limit !== undefined) query = query.limit(limit)

  const [{ data, error }, spot] = await Promise.all([query, getSilverSpotPerOz()])

  if (error) {
    console.error('getFeaturedInventory:', error.message)
    return []
  }

  return withLivePrices(
    (data ?? []).map((row) => normalizePiece(row as Record<string, unknown>)),
    spot
  )
}

/** Sold strip (ordered by sort_order). Pass limit for public homepage. */
export async function getSoldInventory(limit?: number): Promise<ShopPiece[]> {
  const supabase = await createClient()
  let query = supabase
    .from('shop_inventory')
    .select('*')
    .eq('sold', true)
    .order('sort_order', { ascending: true })

  if (limit !== undefined) query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('getSoldInventory:', error.message)
    return []
  }

  // Sold prices stay historical — no live overlay.
  return (data ?? []).map((row) => normalizePiece(row as Record<string, unknown>))
}

export function isBuildActive(build: CurrentBuild | null): boolean {
  return Boolean(build && build.status === 'active' && build.progress_images.length > 0)
}

export function buildHeroSlides(build: CurrentBuild | null): HeroSlide[] {
  const banner = resolveHeroBannerUrl(build?.hero_image)

  if (!isBuildActive(build) || !build) {
    return [{ url: banner, label: 'AWAITING NEXT IGNITION' }]
  }

  const progress = build.progress_images
  const mostRecent = progress[progress.length - 1]
  const sequence: HeroSlide[] = [
    { url: banner, label: 'LIVE FROM THE WORKBENCH' },
    { url: mostRecent, label: 'LATEST UPDATE' },
  ]

  progress.forEach((imgUrl, i) => {
    let label = 'IN PROGRESS'
    if (i === 0 || i === progress.length - 1) label = 'LIVE FROM THE WORKBENCH'
    sequence.push({ url: imgUrl, label })
  })

  return sequence
}
