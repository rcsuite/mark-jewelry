import AdminReviewsHub from '@/components/admin/AdminReviewsHub'
import { getAllReviews } from '@/lib/queries'
import { getReviewCandidates } from '@/lib/review-actions'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const [candidates, reviews] = await Promise.all([
    getReviewCandidates(),
    getAllReviews(),
  ])

  return <AdminReviewsHub candidates={candidates} reviews={reviews} />
}
