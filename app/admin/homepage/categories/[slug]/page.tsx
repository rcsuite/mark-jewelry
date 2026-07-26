import { notFound } from 'next/navigation'
import CategoryEditor from '@/components/admin/CategoryEditor'
import { getCategoryBySlug, getPiecesByCategory } from '@/lib/queries'

type Props = { params: Promise<{ slug: string }> }

export default async function AdminCategoryPage({ params }: Props) {
  const { slug } = await params
  const [category, pieces] = await Promise.all([
    getCategoryBySlug(slug),
    getPiecesByCategory(slug),
  ])

  if (!category) notFound()

  return <CategoryEditor category={category} pieces={pieces} />
}
