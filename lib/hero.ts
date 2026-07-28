/** Fallback when Mark has not uploaded a custom homepage hero banner. */
export const DEFAULT_HERO_BANNER = '/banner2.png'

export function resolveHeroBannerUrl(heroImage: string | null | undefined): string {
  const trimmed = heroImage?.trim()
  return trimmed || DEFAULT_HERO_BANNER
}
