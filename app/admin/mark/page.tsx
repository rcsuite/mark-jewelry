import AdminKnowMarkEditor from '@/components/admin/AdminKnowMarkEditor'
import { getMarkMoments } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminKnowMarkPage() {
  const moments = await getMarkMoments()
  return <AdminKnowMarkEditor moments={moments} />
}
