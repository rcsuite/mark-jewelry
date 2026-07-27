# Visitor chat & Mark notifications

How Contact / Inquire / Admin Messages work, and what must be configured for email.

## Visitor experience

- Contact is an **in-page popup** (`ContactProvider` + `ContactModal`), not a full
  page interrupt. `/contact` redirects into `?contact=1`.
- Visitors pick **live chat** (email + a passcode for this site only — not Supabase
  Auth, so they never get `/admin`) or **email-only**.
- **Inquire about this piece** passes `pieceId` / `pieceTitle`. If they already have
  a chat session cookie, signup is skipped and the chat focuses that piece.
- Composer helper (above the input): `@Piece Title` + “What do you want to ask Mark?”
- On send, the piece tag is **baked into the message body** as:

      @Piece Title
      <visitor text>

  so both the visitor bubble and Mark’s inbox show which piece the question is about
  (`lib/chat-format.ts`, `ChatBubbleBody`). Do not rely only on thread metadata.

## Mark experience

- `/admin/messages` — thread list + reply. Opening a thread clears unread and cancels
  the pending email reminder for those messages.
- Admin hub top bar: red messages icon + unread badge; popup when a new unread arrives
  (`AdminIncomingMessageAlert`).
- Away banner for visitors when `mark_presence.last_active_at` is older than ~30s
  (presence pulsed while Mark is in admin / messages).

## Data (Supabase)

Tables: `chat_threads`, `chat_messages`, `chat_sessions`, `mark_presence`.

Visitor access is via SECURITY DEFINER RPCs (`chat_start`, `chat_fetch`,
`chat_send_visitor`, `chat_set_piece_context`, …) plus httpOnly cookies
`emd_chat_session` / `emd_chat_token`. Mark uses normal authenticated clients.

Unread email path: visitor messages get `email_due_at = now() + 2 minutes`. If Mark
opens the thread first, the reminder is cancelled. Otherwise
`claim_due_chat_email_reminders` + Resend send the digest.

## Email setup (required for phone alerts)

Chat works without email. Unread → phone email does **not** until env is set:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `MARK_NOTIFY_EMAIL` | Address that receives alerts (Mark’s inbox) |
| `MARK_NOTIFY_FROM` | Optional. Default: `Earthen Miners <onboarding@resend.dev>` |
| `CRON_SECRET` | Protects `/api/cron/chat-reminders` |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron claims due reminders server-side |

- While Mark is in `/admin`, `AdminIncomingMessageAlert` also calls
  `processChatEmailReminders()` periodically.
- When Mark is offline, Vercel cron (`vercel.json` → `/api/cron/chat-reminders`) needs
  the secret + service role on the deployment.

Without `RESEND_API_KEY` / `MARK_NOTIFY_EMAIL`, the app logs that email was skipped.

## Key files

- `lib/chat-actions.ts`, `lib/chat-types.ts`, `lib/chat-format.ts`
- `components/chat/*`, `components/admin/AdminMessagesInbox.tsx`
- `components/admin/AdminIncomingMessageAlert.tsx`
- `app/api/cron/chat-reminders/route.ts`
