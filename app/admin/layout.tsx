import AuthSessionKeeper from '@/components/admin/AuthSessionKeeper'
import AdminTopBar from '@/components/admin/AdminTopBar'
import AdminIncomingMessageAlert from '@/components/admin/AdminIncomingMessageAlert'
import { countUnreadForMark } from '@/lib/chat-actions'
import { getSilverQuote } from '@/lib/silver'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [silver, unread] = await Promise.all([getSilverQuote(), countUnreadForMark()])

  return (
    <>
      <AuthSessionKeeper />
      <AdminTopBar silver={silver} initialUnread={unread} />
      <AdminIncomingMessageAlert initialUnread={unread} />
      {children}
    </>
  )
}
