import { Suspense } from 'react'
import ShopGallery from '@/components/shop/ShopGallery'
import { getCategories, getShopInventory } from '@/lib/queries'

export default async function ShopPage() {
  const [items, categories] = await Promise.all([getShopInventory(), getCategories()])

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070A] flex items-center justify-center text-white display-font tracking-widest">
          Accessing Vault...
        </div>
      }
    >
      <ShopGallery items={items} categories={categories} />
    </Suspense>
  )
}
