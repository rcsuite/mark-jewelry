# Visitor chat & Mark notifications

How Contact / Inquire / Admin Messages work, and what must be configured for email.

## Visitor experience

- Contact is an **in-page popup** (`ContactProvider` + `ContactModal`), not a full
  page interrupt. `/contact` redirects into `?contact=1`.
- Contact popup tabs: **New chat** (name + email + live/email-only) or **Continue
  chat** (email only). Selected tab = teal fill; unselected = mustard so they stand out.
- **Same email = same thread.** No visitor password. `chat_threads.visitor_email` is the
  key; typing that email (New or Continue) reopens the conversation. Same browser also
  keeps cookies ~400 days. Visitors are still not Supabase Auth users (no `/admin`).
- Tradeoff: anyone who knows a visitor’s email can open that chat — acceptable for this
  one-artisan shop; don’t use for sensitive customer data.
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
`claim_due_chat_email_reminders` bundles **all** unseen visitor messages in that
thread into one digest and Resend sends it (with a link to `/admin/messages`).

## Email setup (required for phone alerts)

Chat works without email. Unread → phone email does **not** until env is set:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `MARK_NOTIFY_EMAIL` | Address that receives alerts (Mark’s inbox) |
| `MARK_NOTIFY_FROM` | Optional but recommended. Verified domain From, e.g. `Earthen Miners <inquiry@earthenminersdesigns.com>`. Default: `onboarding@resend.dev` (test-only). |
| `CRON_SECRET` | Protects `/api/cron/chat-reminders`. Set on **Vercel** (and optionally `.env.local` for local curls). The Supabase Cron job must send the **same** value as `Authorization: Bearer …`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron claims due reminders server-side (required when Mark is offline) — lives on **Vercel**, not in the Cron SQL project |
| `NEXT_PUBLIC_SITE_URL` | Optional. Canonical site origin for links in emails (e.g. `https://earthenminersdesigns.com`). Falls back to Vercel URL. |

- While Mark is in `/admin`, `AdminIncomingMessageAlert` also calls
  `processChatEmailReminders()` periodically.
- When Mark is offline, **Supabase Cron** (on your Pro project) should HTTP GET
  `https://<your-live-domain>/api/cron/chat-reminders` every minute with the Bearer secret.
  Vercel still needs `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` + Resend vars — the route runs there.

Without `RESEND_API_KEY` / `MARK_NOTIFY_EMAIL`, the app logs that email was skipped.

## Key files

- `lib/chat-actions.ts`, `lib/chat-types.ts`, `lib/chat-format.ts`
- `components/chat/*`, `components/admin/AdminMessagesInbox.tsx`
- `components/admin/AdminIncomingMessageAlert.tsx`
- `app/api/cron/chat-reminders/route.ts`
