import AdminMessagesInbox from '@/components/admin/AdminMessagesInbox'
import { listChatThreads } from '@/lib/chat-actions'

export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const result = await listChatThreads()
  const threads = result.ok ? result.data ?? [] : []

  return <AdminMessagesInbox initialThreads={threads} />
}
