export type PieceSpecs = {
  weight?: string
  size?: string
  width?: string
  material?: string
}

export type ShopPiece = {
  id: string
  title: string
  /** Primary category (first of `categories`); kept for older queries. */
  category: string
  /** All categories this piece appears under. */
  categories: string[]
  piece_type: string
  price: number
  /** Stone / other material cost (USD). */
  material_cost: number | null
  /** Labor / workmanship (USD). */
  workmanship_cost: number | null
  /** Fine silver weight used in the formula (grams). */
  silver_grams: number | null
  inquire_for_price: boolean
  /** When true, `price` is a manual override (not live silver formula). */
  manual_price: boolean
  photos: string[]
  description: string | null
  /** Where the piece ended up — set when marking sold. */
  sold_note: string | null
  tags: string[] | null
  specs: PieceSpecs | null
  created_at: string | null
  sold: boolean
  sort_order: number
  featured: boolean
  featured_sort_order: number
}

export type VideoSession = {
  id: number
  title: string
  date: string
  url: string
}

export type CurrentBuild = {
  id: string
  status: string | null
  hero_image: string
  progress_images: string[]
  description: string | null
  video_archive: VideoSession[] | null
  updated_at: string | null
}

export type HeroSlide = {
  url: string
  label: string
}

export type Category = {
  id: string
  slug: string
  title: string
  short_name: string
  description: string
  image_url: string | null
  sort_order: number
  show_on_homepage: boolean
}

export type Review = {
  id: string
  quote: string
  author: string
  location: string
  rating: number
  sort_order: number
}

/** Personal / hobby photos for the Know Mark bridge. */
export type MarkMoment = {
  id: string
  image_url: string
  caption: string
  sort_order: number
  created_at: string | null
}

/** Singleton homepage display knobs (`site_settings` id = 1). */
export type SiteSettings = {
  handiworks_display_count: number
  sold_display_count: number
}
