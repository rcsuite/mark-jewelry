import AdminHub from '@/components/admin/AdminHub'
import AdminPriceSync from '@/components/admin/AdminPriceSync'
import { getCategories, getShopInventory } from '@/lib/queries'
import { getSilverQuote } from '@/lib/silver'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [pieces, categories, silver] = await Promise.all([
    getShopInventory(),
    getCategories(),
    getSilverQuote(),
  ])

  return (
    <>
      <AdminPriceSync />
      <AdminHub pieces={pieces} categories={categories} silver={silver} />
    </>
  )
}
