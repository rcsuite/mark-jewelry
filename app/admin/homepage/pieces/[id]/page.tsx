import { notFound } from 'next/navigation'
import PieceEditor from '@/components/admin/PieceEditor'
import { getCategories, getPartners, getPieceById } from '@/lib/queries'
import { getSilverSpotPerOz } from '@/lib/silver'

type Props = { params: Promise<{ id: string }> }

export default async function AdminPiecePage({ params }: Props) {
  const { id } = await params
  const [piece, categories, partners, spotPerOz] = await Promise.all([
    getPieceById(id),
    getCategories(),
    getPartners(),
    getSilverSpotPerOz(),
  ])

  if (!piece) notFound()

  return (
    <PieceEditor
      piece={piece}
      categories={categories}
      partners={partners}
      spotPerOz={spotPerOz}
    />
  )
}
