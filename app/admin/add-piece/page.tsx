import AddPieceForm from '@/components/admin/AddPieceForm'
import { getCategories } from '@/lib/queries'
import { getSilverSpotPerOz } from '@/lib/silver'

export default async function AddPiecePage() {
  const [categories, spotPerOz] = await Promise.all([getCategories(), getSilverSpotPerOz()])

  return <AddPieceForm categories={categories} spotPerOz={spotPerOz} />
}
