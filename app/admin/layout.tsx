import AuthSessionKeeper from '@/components/admin/AuthSessionKeeper'
import AdminTopBar from '@/components/admin/AdminTopBar'
import AdminIncomingMessageAlert from '@/components/admin/AdminIncomingMessageAlert'
import { countUnreadForMark } from '@/lib/chat-actions'
import { getCategories, getShopInventory } from '@/lib/queries'
import { getSilverQuote } from '@/lib/silver'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [silver, unread, pieces, categories] = await Promise.all([
    getSilverQuote(),
    countUnreadForMark(),
    getShopInventory(),
    getCategories(),
  ])

  return (
    <>
      <AuthSessionKeeper />
      <AdminTopBar
        silver={silver}
        initialUnread={unread}
        pieces={pieces}
        categories={categories}
      />
      <AdminIncomingMessageAlert initialUnread={unread} />
      {children}
    </>
  )
}
