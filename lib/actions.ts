'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/categories'
import { toCategory, toReview, toMarkMoment, normalizePiece } from '@/lib/queries'
import { assertPersistentImageUrls } from '@/lib/auth-session'
import {
  computePriceBreakdown,
  hasPricingFormula,
  normalizeCategoryList,
  withLivePrice,
} from '@/lib/pricing'
import { getSilverSpotPerOz } from '@/lib/silver'
import type { Category, MarkMoment, Review, ShopPiece, SiteSettings } from '@/lib/types'
import { DEFAULT_SITE_SETTINGS } from '@/lib/queries'

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null as null }
  return { supabase, user }
}

function revalidateStorefront() {
  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath('/mark')
  revalidatePath('/contact')
  revalidatePath('/admin')
  revalidatePath('/admin/homepage')
  revalidatePath('/admin/mark')
  revalidatePath('/admin/add-piece')
  revalidatePath('/admin/current-project')
}

export type CreateCategoryResult =
  | { ok: true; category: Category; created: boolean }
  | { ok: false; error: string }

export async function createCategory(rawName: string): Promise<CreateCategoryResult> {
  const name = rawName.trim()
  if (!name) return { ok: false, error: 'Category name is required.' }

  const slug = slugify(name)
  if (!slug) return { ok: false, error: 'Category name needs at least one letter or number.' }

  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: existing } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { ok: true, category: toCategory(existing as Record<string, unknown>), created: false }
  }

  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSortOrder = Number(maxRow?.sort_order ?? 0) + 10

  const { data, error } = await supabase
    .from('categories')
    .insert({
      slug,
      title: name,
      short_name: name,
      description: '',
      sort_order: nextSortOrder,
      show_on_homepage: true,
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true, category: toCategory(data as Record<string, unknown>), created: true }
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const updates = orderedIds.map((id, index) =>
    supabase.from('categories').update({ sort_order: (index + 1) * 10 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function updateCategory(input: {
  id: string
  title?: string
  short_name?: string
  description?: string
  image_url?: string | null
  show_on_homepage?: boolean
}): Promise<ActionResult<Category>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.short_name !== undefined) patch.short_name = input.short_name.trim()
  if (input.description !== undefined) patch.description = input.description
  if (input.image_url !== undefined) patch.image_url = input.image_url
  if (input.show_on_homepage !== undefined) patch.show_on_homepage = input.show_on_homepage

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true, data: toCategory(data as Record<string, unknown>) }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function reorderPieces(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const updates = orderedIds.map((id, index) =>
    supabase.from('shop_inventory').update({ sort_order: (index + 1) * 10 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function reorderFeatured(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('shop_inventory')
      .update({ featured: true, featured_sort_order: (index + 1) * 10 })
      .eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function setPieceFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  let featured_sort_order = 0
  if (featured) {
    const { data: maxRow } = await supabase
      .from('shop_inventory')
      .select('featured_sort_order')
      .eq('featured', true)
      .order('featured_sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    featured_sort_order = Number(maxRow?.featured_sort_order ?? 0) + 10
  }

  const { error } = await supabase
    .from('shop_inventory')
    .update({ featured, featured_sort_order })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true }
}

export type PieceUpdateInput = {
  id: string
  title?: string
  category?: string
  categories?: string[]
  piece_type?: string
  price?: number
  material_cost?: number | null
  workmanship_cost?: number | null
  silver_grams?: number | null
  inquire_for_price?: boolean
  manual_price?: boolean
  description?: string | null
  sold_note?: string | null
  buyer_name?: string | null
  buyer_email?: string | null
  tags?: string[]
  specs?: ShopPiece['specs']
  photos?: string[]
  sold?: boolean
  featured?: boolean
}

export async function updatePiece(input: PieceUpdateInput): Promise<ActionResult<ShopPiece>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.piece_type !== undefined) patch.piece_type = input.piece_type.trim()
  if (input.description !== undefined) patch.description = input.description
  if (input.tags !== undefined) patch.tags = input.tags
  if (input.specs !== undefined) patch.specs = input.specs
  if (input.photos !== undefined) {
    try {
      assertPersistentImageUrls(input.photos)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid photo URLs.' }
    }
    patch.photos = input.photos
  }
  if (input.sold !== undefined) patch.sold = input.sold
  if (input.sold_note !== undefined) patch.sold_note = input.sold_note
  if (input.buyer_name !== undefined) patch.buyer_name = input.buyer_name
  if (input.buyer_email !== undefined) {
    patch.buyer_email = input.buyer_email?.trim().toLowerCase() || null
  }
  if (input.sold === true) {
    patch.sold_at = new Date().toISOString()
  } else if (input.sold === false) {
    patch.sold_at = null
  }
  if (input.manual_price !== undefined) patch.manual_price = input.manual_price
  if (input.featured !== undefined) {
    patch.featured = input.featured
    if (input.featured) {
      const { data: maxRow } = await supabase
        .from('shop_inventory')
        .select('featured_sort_order')
        .eq('featured', true)
        .order('featured_sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      patch.featured_sort_order = Number(maxRow?.featured_sort_order ?? 0) + 10
    }
  }

  if (input.categories !== undefined || input.category !== undefined) {
    const primary = input.category ?? input.categories?.[0] ?? ''
    const list = normalizeCategoryList(primary, input.categories ?? (primary ? [primary] : []))
    if (list.length === 0) return { ok: false, error: 'Pick at least one category.' }
    patch.category = list[0]
    patch.categories = list
  }

  if (input.material_cost !== undefined) patch.material_cost = input.material_cost
  if (input.workmanship_cost !== undefined) patch.workmanship_cost = input.workmanship_cost
  if (input.silver_grams !== undefined) patch.silver_grams = input.silver_grams
  if (input.inquire_for_price !== undefined) patch.inquire_for_price = input.inquire_for_price

  const spot = await getSilverSpotPerOz()
  const pricingTouched =
    input.material_cost !== undefined ||
    input.workmanship_cost !== undefined ||
    input.silver_grams !== undefined ||
    input.inquire_for_price !== undefined ||
    input.manual_price !== undefined ||
    input.price !== undefined

  if (pricingTouched) {
    const { data: existing } = await supabase
      .from('shop_inventory')
      .select(
        'material_cost, workmanship_cost, silver_grams, inquire_for_price, manual_price, sold, price'
      )
      .eq('id', input.id)
      .maybeSingle()

    const material_cost =
      input.material_cost !== undefined
        ? input.material_cost
        : existing
          ? Number(existing.material_cost)
          : null
    const workmanship_cost =
      input.workmanship_cost !== undefined
        ? input.workmanship_cost
        : existing
          ? Number(existing.workmanship_cost)
          : null
    const silver_grams =
      input.silver_grams !== undefined
        ? input.silver_grams
        : existing
          ? Number(existing.silver_grams)
          : null
    const inquire =
      input.inquire_for_price !== undefined
        ? input.inquire_for_price
        : Boolean(existing?.inquire_for_price)
    const manual =
      input.manual_price !== undefined
        ? input.manual_price
        : Boolean(existing?.manual_price)
    const sold = input.sold !== undefined ? input.sold : Boolean(existing?.sold)

    const draft = {
      material_cost: material_cost !== null && Number.isFinite(material_cost) ? material_cost : null,
      workmanship_cost:
        workmanship_cost !== null && Number.isFinite(workmanship_cost) ? workmanship_cost : null,
      silver_grams: silver_grams !== null && Number.isFinite(silver_grams) ? silver_grams : null,
      inquire_for_price: inquire,
      manual_price: manual,
      sold,
      price: input.price ?? Number(existing?.price ?? 0),
    }

    if (manual) {
      if (input.price !== undefined) patch.price = input.price
    } else if (!sold && hasPricingFormula(draft) && spot !== null) {
      patch.price = computePriceBreakdown(
        {
          materialCost: draft.material_cost!,
          workmanshipCost: draft.workmanship_cost!,
          silverGrams: draft.silver_grams!,
        },
        spot
      ).total
    } else if (input.price !== undefined) {
      patch.price = input.price
    }
  } else if (input.price !== undefined) {
    patch.price = input.price
  }

  const { data, error } = await supabase
    .from('shop_inventory')
    .update(patch)
    .eq('id', input.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  revalidatePath(`/admin/homepage/pieces/${input.id}`)
  return {
    ok: true,
    data: withLivePrice(normalizePiece(data as Record<string, unknown>), spot),
  }
}

/**
 * Rewrite `price` on every unsold formula piece from current silver spot.
 * Call when Mark opens admin (or after spot refresh) so DB stays in sync.
 */
export async function repriceInventoryFromSpot(): Promise<
  ActionResult<{ updated: number; spotPerOz: number }>
> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const spot = await getSilverSpotPerOz()
  if (spot === null) return { ok: false, error: 'Silver spot unavailable.' }

  await supabase.from('market_silver').upsert({
    id: 1,
    price_per_oz: spot,
    as_of: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  const { data, error } = await supabase
    .from('shop_inventory')
    .select(
      'id, material_cost, workmanship_cost, silver_grams, inquire_for_price, manual_price, sold, price'
    )
    .eq('sold', false)
    .eq('manual_price', false)

  if (error) return { ok: false, error: error.message }

  let updated = 0
  for (const row of data ?? []) {
    const piece = {
      material_cost: row.material_cost === null ? null : Number(row.material_cost),
      workmanship_cost: row.workmanship_cost === null ? null : Number(row.workmanship_cost),
      silver_grams: row.silver_grams === null ? null : Number(row.silver_grams),
      inquire_for_price: Boolean(row.inquire_for_price),
      sold: Boolean(row.sold),
      price: Number(row.price ?? 0),
    }
    if (!hasPricingFormula(piece)) continue
    const next = computePriceBreakdown(
      {
        materialCost: piece.material_cost!,
        workmanshipCost: piece.workmanship_cost!,
        silverGrams: piece.silver_grams!,
      },
      spot
    ).total
    if (Math.abs(next - piece.price) < 0.005) continue
    const { error: upErr } = await supabase
      .from('shop_inventory')
      .update({ price: next })
      .eq('id', row.id)
    if (!upErr) updated += 1
  }

  if (updated > 0) revalidateStorefront()
  return { ok: true, data: { updated, spotPerOz: spot } }
}

export async function reorderReviews(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const updates = orderedIds.map((id, index) =>
    supabase.from('reviews').update({ sort_order: (index + 1) * 10 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function upsertReview(input: {
  id?: string
  quote: string
  author: string
  location: string
  rating: number
  image_url?: string | null
  status?: 'pending' | 'published'
}): Promise<ActionResult<Review>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const quote = input.quote.trim()
  const author = input.author.trim()
  if (!quote || !author) return { ok: false, error: 'Quote and author are required.' }

  if (input.image_url) {
    try {
      assertPersistentImageUrls([input.image_url])
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid photo URL.' }
    }
  }

  const image_url = input.image_url === undefined ? undefined : input.image_url || null
  const status = input.status ?? 'published'

  if (input.id) {
    const patch: Record<string, unknown> = {
      quote,
      author,
      location: input.location.trim(),
      rating: input.rating,
      status,
    }
    if (image_url !== undefined) patch.image_url = image_url

    const { data, error } = await supabase
      .from('reviews')
      .update(patch)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidateStorefront()
    revalidatePath('/admin/reviews')
    return { ok: true, data: toReview(data as Record<string, unknown>) }
  }

  const { data: maxRow } = await supabase
    .from('reviews')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      quote,
      author,
      location: input.location.trim(),
      rating: input.rating,
      sort_order: Number(maxRow?.sort_order ?? 0) + 10,
      image_url: image_url ?? null,
      status,
      source: 'admin',
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateStorefront()
  revalidatePath('/admin/reviews')
  return { ok: true, data: toReview(data as Record<string, unknown>) }
}

export async function updateHomepageDisplayCounts(input: {
  handiworks_display_count?: number
  sold_display_count?: number
}): Promise<ActionResult<SiteSettings>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const clamp = (n: number, fallback: number) => {
    if (!Number.isFinite(n)) return fallback
    return Math.min(48, Math.max(1, Math.round(n)))
  }

  const { data: existing } = await supabase
    .from('site_settings')
    .select('handiworks_display_count, sold_display_count')
    .eq('id', 1)
    .maybeSingle()

  const current: SiteSettings = {
    handiworks_display_count: clamp(
      Number(existing?.handiworks_display_count),
      DEFAULT_SITE_SETTINGS.handiworks_display_count
    ),
    sold_display_count: clamp(
      Number(existing?.sold_display_count),
      DEFAULT_SITE_SETTINGS.sold_display_count
    ),
  }

  const next: SiteSettings = {
    handiworks_display_count:
      input.handiworks_display_count !== undefined
        ? clamp(input.handiworks_display_count, current.handiworks_display_count)
        : current.handiworks_display_count,
    sold_display_count:
      input.sold_display_count !== undefined
        ? clamp(input.sold_display_count, current.sold_display_count)
        : current.sold_display_count,
  }

  const patch = { ...next, updated_at: new Date().toISOString() }

  if (existing) {
    const { data, error } = await supabase
      .from('site_settings')
      .update(patch)
      .eq('id', 1)
      .select('handiworks_display_count, sold_display_count')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidateStorefront()
    return {
      ok: true,
      data: {
        handiworks_display_count: Number(data.handiworks_display_count),
        sold_display_count: Number(data.sold_display_count),
      },
    }
  }

  const { data, error } = await supabase
    .from('site_settings')
    .insert({ id: 1, ...patch })
    .select('handiworks_display_count, sold_display_count')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateStorefront()
  return {
    ok: true,
    data: {
      handiworks_display_count: Number(data.handiworks_display_count),
      sold_display_count: Number(data.sold_display_count),
    },
  }
}

/** Homepage hero banner (`current_build.hero_image`). Does not touch progress photos. */
export async function updateHomepageBanner(
  imageUrl: string
): Promise<ActionResult<{ hero_image: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const url = imageUrl.trim()
  try {
    assertPersistentImageUrls([url])
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid image URL.' }
  }

  const { data: existing } = await supabase.from('current_build').select('id').limit(1).maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('current_build')
      .update({ hero_image: url })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('current_build').insert({
      hero_image: url,
      progress_images: [],
      status: 'complete',
      description: null,
      video_archive: [],
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateStorefront()
  return { ok: true, data: { hero_image: url } }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function reorderMarkMoments(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const updates = orderedIds.map((id, index) =>
    supabase.from('mark_moments').update({ sort_order: (index + 1) * 10 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: failed.error.message }

  revalidateStorefront()
  return { ok: true }
}

export async function upsertMarkMoment(input: {
  id?: string
  image_url: string
  caption: string
}): Promise<ActionResult<MarkMoment>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  try {
    assertPersistentImageUrls([input.image_url])
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid image URL.' }
  }

  const caption = input.caption.trim()

  if (input.id) {
    const { data, error } = await supabase
      .from('mark_moments')
      .update({ image_url: input.image_url, caption })
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidateStorefront()
    return { ok: true, data: toMarkMoment(data as Record<string, unknown>) }
  }

  const { data: maxRow } = await supabase
    .from('mark_moments')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('mark_moments')
    .insert({
      image_url: input.image_url,
      caption,
      sort_order: Number(maxRow?.sort_order ?? 0) + 10,
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateStorefront()
  return { ok: true, data: toMarkMoment(data as Record<string, unknown>) }
}

export async function deleteMarkMoment(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { error } = await supabase.from('mark_moments').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidateStorefront()
  return { ok: true }
}
