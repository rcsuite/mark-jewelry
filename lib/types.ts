export type PieceSpecs = {
  weight?: string
  size?: string
  width?: string
  material?: string
}

export type ShopPiece = {
  id: string
  title: string
  category: string
  piece_type: string
  price: number
  photos: string[]
  description: string | null
  tags: string[] | null
  specs: PieceSpecs | null
  created_at: string | null
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
