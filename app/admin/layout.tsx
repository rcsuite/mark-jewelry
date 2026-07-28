import AuthSessionKeeper from '@/components/admin/AuthSessionKeeper'
import AdminTopBar from '@/components/admin/AdminTopBar'
import AdminIncomingMessageAlert from '@/components/admin/AdminIncomingMessageAlert'
import { countUnreadForMark } from '@/lib/chat-actions'
import { countReviewDue } from '@/lib/review-actions'
import { getCategories, getShopInventory } from '@/lib/queries'
import { getSilverQuote } from '@/lib/silver'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [silver, unread, reviewDue, pieces, categories] = await Promise.all([
    getSilverQuote(),
    countUnreadForMark(),
    countReviewDue(),
    getShopInventory(),
    getCategories(),
  ])

  return (
    <>
      <AuthSessionKeeper />
      <AdminTopBar
        silver={silver}
        initialUnread={unread}
        initialReviewDue={reviewDue}
        pieces={pieces}
        categories={categories}
      />
      <AdminIncomingMessageAlert initialUnread={unread} />
      {children}
    </>
  )
}
