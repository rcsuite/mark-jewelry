import AdminMessagesInbox from '@/components/admin/AdminMessagesInbox'
import { listChatThreads } from '@/lib/chat-actions'
import { getSiteSettings } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const [result, settings] = await Promise.all([listChatThreads(), getSiteSettings()])
  const threads = result.ok ? result.data ?? [] : []

  return (
    <AdminMessagesInbox
      initialThreads={threads}
      initialPaymentHandles={{
        paypal_handle: settings.paypal_handle,
        zelle_target: settings.zelle_target,
      }}
    />
  )
}
