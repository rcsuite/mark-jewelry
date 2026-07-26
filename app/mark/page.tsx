import KnowMarkGallery from '@/components/mark/KnowMarkGallery'
import { getMarkMoments } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function KnowMarkPage() {
  const moments = await getMarkMoments()
  return <KnowMarkGallery moments={moments} />
}
