import { loadReviewInvite } from '@/lib/review-actions'
import PublicReviewForm from './PublicReviewForm'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ token: string }>
}

export default async function ReviewInvitePage({ params }: Props) {
  const { token } = await params
  const result = await loadReviewInvite(token)

  if (!result.ok || !result.data) {
    return (
      <div className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl uppercase tracking-wider font-semibold">Link unavailable</h1>
          <p className="text-[#A1A1AA] text-sm">
            {!result.ok ? result.error : 'This review link is invalid.'}
          </p>
        </div>
      </div>
    )
  }

  return <PublicReviewForm invite={result.data} />
}
