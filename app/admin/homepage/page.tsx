import AdminHomepageEditor from '@/components/admin/AdminHomepageEditor'
import {
  buildHeroSlides,
  getAvailableInventory,
  getCategories,
  getCurrentBuild,
  getFeaturedInventory,
  getReviews,
  getSoldInventory,
  isBuildActive,
} from '@/lib/queries'

export default async function AdminHomepagePage() {
  const [build, categories, reviews, featured, sold, available] = await Promise.all([
    getCurrentBuild(),
    getCategories(),
    getReviews(),
    getFeaturedInventory(12),
    getSoldInventory(24),
    getAvailableInventory(),
  ])

  return (
    <AdminHomepageEditor
      build={build}
      slides={buildHeroSlides(build)}
      forgeActive={isBuildActive(build)}
      categories={categories}
      reviews={reviews}
      featured={featured}
      sold={sold}
      availableForFeature={available}
    />
  )
}
