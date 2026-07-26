import AddPieceForm from '@/components/admin/AddPieceForm'
import { getCategories } from '@/lib/queries'

export default async function AddPiecePage() {
  const categories = await getCategories()

  return <AddPieceForm categories={categories} />
}
