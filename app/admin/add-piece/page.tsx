import AddPieceForm from '@/components/admin/AddPieceForm'
import { getCategories, getPartners } from '@/lib/queries'
import { getSilverSpotPerOz } from '@/lib/silver'

export default async function AddPiecePage() {
  const [categories, partners, spotPerOz] = await Promise.all([
    getCategories(),
    getPartners(),
    getSilverSpotPerOz(),
  ])

  return (
    <AddPieceForm categories={categories} partners={partners} spotPerOz={spotPerOz} />
  )
}
