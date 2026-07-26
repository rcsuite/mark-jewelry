'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/categories'
import type { Category } from '@/lib/types'

export type CreateCategoryResult =
  | { ok: true; category: Category; created: boolean }
  | { ok: false; error: string }

/**
 * Create a storefront category from a free-text name. Returns the existing row
 * when the slug is already taken so "Other" never produces duplicates.
 */
export async function createCategory(rawName: string): Promise<CreateCategoryResult> {
  const name = rawName.trim()
  if (!name) {
    return { ok: false, error: 'Category name is required.' }
  }

  const slug = slugify(name)
  if (!slug) {
    return { ok: false, error: 'Category name needs at least one letter or number.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Unauthorized.' }
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { ok: true, category: toCategory(existing), created: false }
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

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath('/admin/add-piece')
  revalidatePath('/admin/current-project')

  return { ok: true, category: toCategory(data), created: true }
}

function toCategory(row: Record<string, unknown>): Category {
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
