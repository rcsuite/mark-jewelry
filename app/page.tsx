import HomePage from '@/components/home/HomePage'
import {
  buildHeroSlides,
  getCategories,
  getCurrentBuild,
  getFeaturedInventory,
  getReviews,
  getSoldInventory,
  isBuildActive,
} from '@/lib/queries'

export default async function Home() {
  const [build, featured, categories, reviews, sold] = await Promise.all([
    getCurrentBuild(),
    getFeaturedInventory(4),
    getCategories(),
    getReviews(),
    getSoldInventory(12),
  ])
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
    />
  )
}
