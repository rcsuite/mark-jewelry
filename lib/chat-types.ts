export type ChatSender = 'visitor' | 'mark'

export type ChatMessage = {
  id: string
  sender: ChatSender
  body: string
  created_at: string
}

export type ChatThreadSummary = {
  id: string
  visitor_name: string
  visitor_email: string
  piece_id: string | null
  piece_title: string | null
  viewing_context?: string | null
  mode: 'live' | 'email_only'
  last_message_at: string
  unread_for_mark: number
  created_at: string
}

export const CHAT_COOKIE_SESSION = 'emd_chat_session'
export const CHAT_COOKIE_TOKEN = 'emd_chat_token'
