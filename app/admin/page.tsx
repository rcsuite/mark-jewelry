import AdminHomepageEditor from '@/components/admin/AdminHomepageEditor'
import AdminPriceSync from '@/components/admin/AdminPriceSync'
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

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [build, categories, reviews, featured, sold, available, settings] = await Promise.all([
    getCurrentBuild(),
    getCategories(),
    getReviews(),
    getFeaturedInventory(),
    getSoldInventory(),
    getAvailableInventory(),
    getSiteSettings(),
  ])

  return (
    <>
      <AdminPriceSync />
      <AdminHomepageEditor
        build={build}
        slides={buildHeroSlides(build)}
        forgeActive={isBuildActive(build)}
        categories={categories}
        reviews={reviews}
        featured={featured}
        sold={sold}
        availableForFeature={available}
        settings={settings}
      />
    </>
  )
}
