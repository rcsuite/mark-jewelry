import HomePage from '@/components/home/HomePage'
import {
  buildHeroSlides,
  getCategories,
  getCurrentBuild,
  getFeaturedInventory,
  isBuildActive,
} from '@/lib/queries'

export default async function Home() {
  const [build, featured, categories] = await Promise.all([
    getCurrentBuild(),
    getFeaturedInventory(4),
    getCategories(),
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
    />
  )
}
