import HomePage from '@/components/home/HomePage'
import {
  buildHeroSlides,
  getAvailableInventory,
  getCategories,
  getCurrentBuild,
  getFeaturedInventory,
  getReviews,
  getSiteSettings,
  getSoldInventory,
  isBuildActive,
} from '@/lib/queries'

export default async function Home() {
  const [build, settings, categories, reviews, available] = await Promise.all([
    getCurrentBuild(),
    getSiteSettings(),
    getCategories(),
    getReviews(),
    getAvailableInventory(),
  ])

  const [featuredAll, soldAll] = await Promise.all([
    getFeaturedInventory(),
    getSoldInventory(),
  ])

  const featured = featuredAll.slice(0, settings.handiworks_display_count)
  const sold = soldAll.slice(0, settings.sold_display_count)
  const slides = buildHeroSlides(build)
  const forgeActive = isBuildActive(build)

  return (
    <HomePage
      build={build}
      slides={slides}
      featured={featured}
      forgeActive={forgeActive}
      categories={categories.filter((c) => c.show_on_homepage)}
      reviews={reviews}
      sold={sold}
      handiworksDisplayCount={settings.handiworks_display_count}
      soldDisplayCount={settings.sold_display_count}
      availableCount={available.length}
      soldTotalCount={soldAll.length}
    />
  )
}
