'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CHAT_COOKIE_SESSION,
  CHAT_COOKIE_TOKEN,
  type ChatMessage,
  type ChatThreadSummary,
} from '@/lib/chat-types'
import { adminMessagesUrl } from '@/lib/site-url'
import { getPieceById } from '@/lib/queries'

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null as null }
  return { supabase, user }
}

async function setChatCookies(sessionId: string, token: string) {
  const jar = await cookies()
  jar.set(CHAT_COOKIE_SESSION, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  jar.set(CHAT_COOKIE_TOKEN, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function getChatCookiePair(): Promise<{
  sessionId: string | null
  token: string | null
}> {
  const jar = await cookies()
  return {
    sessionId: jar.get(CHAT_COOKIE_SESSION)?.value ?? null,
    token: jar.get(CHAT_COOKIE_TOKEN)?.value ?? null,
  }
}

/**
 * If the visitor already has a live-chat session, attach piece context and skip signup.
 * Otherwise the UI should open the contact modal.
 */
export async function focusChatAboutPiece(input: {
  pieceId?: string | null
  pieceTitle?: string | null
}): Promise<
  ActionResult<{
    hasSession: boolean
    pieceTitle: string | null
  }>
> {
  const { sessionId, token } = await getChatCookiePair()
  if (!sessionId || !token) {
    return { ok: true, data: { hasSession: false, pieceTitle: input.pieceTitle ?? null } }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('chat_set_piece_context', {
    p_session_id: sessionId,
    p_token: token,
    p_piece_id: input.pieceId || null,
    p_piece_title: input.pieceTitle || null,
  })

  if (error) return { ok: false, error: error.message }

  const payload = data as { ok?: boolean; error?: string }
  if (!payload?.ok) {
    // Stale cookies — treat as no session so they can sign in again.
    return { ok: true, data: { hasSession: false, pieceTitle: input.pieceTitle ?? null } }
  }

  return {
    ok: true,
    data: {
      hasSession: true,
      pieceTitle: input.pieceTitle ?? null,
    },
  }
}

function formatMessageDigest(bodies: string[]): string {
  if (bodies.length === 1) return bodies[0]
  return bodies.map((b, i) => `— Message ${i + 1} —\n${b}`).join('\n\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function notifyMarkEmail(input: {
  visitorName: string
  visitorEmail: string
  /** One or more visitor messages to include in a single email. */
  bodies: string[]
  pieceTitle?: string | null
  subjectPrefix?: string
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.MARK_NOTIFY_EMAIL
  const from = process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'
  const inboxUrl = adminMessagesUrl()
  const bodies = input.bodies.map((b) => b.trim()).filter(Boolean)
  if (!bodies.length) return { sent: false, reason: 'empty' }

  // #region agent log
  fetch('http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e29f9' },
    body: JSON.stringify({
      sessionId: '2e29f9',
      hypothesisId: 'A',
      location: 'lib/chat-actions.ts:notifyMarkEmail:entry',
      message: 'notifyMarkEmail env check',
      data: {
        hasApiKey: Boolean(apiKey),
        apiKeyLen: apiKey?.length ?? 0,
        apiKeyPrefix: apiKey?.slice(0, 3) ?? null,
        hasTo: Boolean(to),
        toDomain: to?.includes('@') ? to.split('@')[1] : null,
        fromUsesDefault: !process.env.MARK_NOTIFY_FROM,
        fromHost: from.match(/@([^>]+)/)?.[1] ?? null,
        hasPiece: Boolean(input.pieceTitle),
        messageCount: bodies.length,
      },
      timestamp: Date.now(),
      runId: 'resend-trial',
    }),
  }).catch(() => {})
  // #endregion

  if (!apiKey || !to) {
    console.info(
      '[chat] Mark email skipped — set RESEND_API_KEY and MARK_NOTIFY_EMAIL to enable.'
    )
    // #region agent log
    fetch('http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e29f9' },
      body: JSON.stringify({
        sessionId: '2e29f9',
        hypothesisId: 'A',
        location: 'lib/chat-actions.ts:notifyMarkEmail:missing_env',
        message: 'skipped missing env',
        data: { reason: 'missing_env' },
        timestamp: Date.now(),
        runId: 'resend-trial',
      }),
    }).catch(() => {})
    // #endregion
    return { sent: false, reason: 'missing_env' }
  }

  const pieceLine = input.pieceTitle ? `\nPiece: ${input.pieceTitle}` : ''
  const prefix = input.subjectPrefix ?? 'Chat'
  const digest = formatMessageDigest(bodies)
  const countNote =
    bodies.length > 1 ? ` (${bodies.length} messages)` : ''
  const text = `${prefix} from ${input.visitorName} <${input.visitorEmail}>${pieceLine}${countNote}\n\n${digest}\n\nOpen Admin → Messages:\n${inboxUrl}`
  const htmlDigest = bodies
    .map((b, i) => {
      const label =
        bodies.length > 1
          ? `<p style="margin:16px 0 4px;color:#71717A;font-size:12px;">Message ${i + 1}</p>`
          : ''
      return `${label}<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(b)}</pre>`
    })
    .join('')
  const html = `<p>${escapeHtml(prefix)} from <strong>${escapeHtml(input.visitorName)}</strong> &lt;${escapeHtml(input.visitorEmail)}&gt;${
    input.pieceTitle ? `<br/>Piece: ${escapeHtml(input.pieceTitle)}` : ''
  }</p>${htmlDigest}<p style="margin-top:24px;"><a href="${escapeHtml(inboxUrl)}">Open Admin → Messages</a></p>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.pieceTitle
          ? `${prefix}: ${input.pieceTitle}${countNote}`
          : `${prefix} from ${input.visitorName}${countNote}`,
        text,
        html,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[chat] Resend error', res.status, errText)
      // #region agent log
      fetch('http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e29f9' },
        body: JSON.stringify({
          sessionId: '2e29f9',
          hypothesisId: 'B',
          location: 'lib/chat-actions.ts:notifyMarkEmail:resend_error',
          message: 'Resend API non-OK',
          data: {
            status: res.status,
            errSnippet: errText.slice(0, 400),
            fromHost: from.match(/@([^>]+)/)?.[1] ?? null,
          },
          timestamp: Date.now(),
          runId: 'resend-trial',
        }),
      }).catch(() => {})
      // #endregion
      return { sent: false, reason: 'resend_error' }
    }
    // #region agent log
    const okBody = await res.text()
    fetch('http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e29f9' },
      body: JSON.stringify({
        sessionId: '2e29f9',
        hypothesisId: 'A',
        location: 'lib/chat-actions.ts:notifyMarkEmail:success',
        message: 'Resend accepted email',
        data: { status: res.status, bodySnippet: okBody.slice(0, 200) },
        timestamp: Date.now(),
        runId: 'resend-trial',
      }),
    }).catch(() => {})
    // #endregion
    return { sent: true }
  } catch (err) {
    console.error('[chat] Resend failed', err)
    // #region agent log
    fetch('http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e29f9' },
      body: JSON.stringify({
        sessionId: '2e29f9',
        hypothesisId: 'E',
        location: 'lib/chat-actions.ts:notifyMarkEmail:network',
        message: 'Resend fetch threw',
        data: { err: err instanceof Error ? err.message : 'unknown' },
        timestamp: Date.now(),
        runId: 'resend-trial',
      }),
    }).catch(() => {})
    // #endregion
    return { sent: false, reason: 'network' }
  }
}

export async function startChat(input: {
  /** Required for brand-new emails; omit when Continuing with an existing email. */
  name?: string
  email: string
  mode: 'live' | 'email_only'
  message?: string
  pieceId?: string | null
  pieceTitle?: string | null
  viewingContext?: string | null
}): Promise<
  ActionResult<{
    mode: 'live' | 'email_only'
    openWidget: boolean
  }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('chat_start', {
    p_name: input.name ?? '',
    p_email: input.email,
    p_passcode: '',
    p_piece_id: input.pieceId || null,
    p_piece_title: input.pieceTitle || null,
    p_mode: input.mode,
    p_viewing_context: input.viewingContext || input.pieceTitle || null,
  })

  if (error) return { ok: false, error: error.message }

  const payload = data as {
    ok?: boolean
    error?: string
    mode?: string
    thread_id?: string
    session_id?: string
    session_token?: string
  }

  if (!payload?.ok) return { ok: false, error: payload?.error || 'Could not start chat.' }

  if (payload.mode === 'email_only' && payload.thread_id) {
    const body = (input.message || '').trim()
    if (!body) return { ok: false, error: 'Write a message for Mark.' }

    const { data: postData, error: postErr } = await supabase.rpc('chat_post_email_only', {
      p_thread_id: payload.thread_id,
      p_body: body,
    })
    if (postErr) return { ok: false, error: postErr.message }
    const post = postData as {
      ok?: boolean
      error?: string
      should_email_mark?: boolean
      thread?: { visitor_name: string; visitor_email: string; piece_title?: string | null }
      message?: { body: string }
    }
    if (!post?.ok) return { ok: false, error: post?.error || 'Could not send email.' }

    if (post.should_email_mark && post.thread) {
      await notifyMarkEmail({
        visitorName: post.thread.visitor_name,
        visitorEmail: post.thread.visitor_email,
        bodies: [post.message?.body || body],
        pieceTitle: post.thread.piece_title,
      })
    }

    revalidatePath('/admin/messages')
    return { ok: true, data: { mode: 'email_only', openWidget: false } }
  }

  if (!payload.session_id || !payload.session_token) {
    return { ok: false, error: 'Chat session missing.' }
  }

  await setChatCookies(payload.session_id, payload.session_token)

  const opener = (input.message || '').trim()
  if (opener) {
    const send = await sendVisitorMessage(opener)
    if (!send.ok) return send
  }

  revalidatePath('/admin/messages')
  return { ok: true, data: { mode: 'live', openWidget: true } }
}

export async function fetchVisitorChat(): Promise<
  ActionResult<{
    thread: {
      id: string
      visitor_name: string
      visitor_email: string
      piece_id: string | null
      piece_title: string | null
      viewing_context?: string | null
    }
    messages: ChatMessage[]
    markIsAway: boolean
  } | null>
> {
  const { sessionId, token } = await getChatCookiePair()
  if (!sessionId || !token) return { ok: true, data: null }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('chat_fetch', {
    p_session_id: sessionId,
    p_token: token,
  })
  if (error) return { ok: false, error: error.message }

  const payload = data as {
    ok?: boolean
    error?: string
    mark_is_away?: boolean
    thread?: {
      id: string
      visitor_name: string
      visitor_email: string
      piece_id: string | null
      piece_title: string | null
      viewing_context?: string | null
    }
    messages?: ChatMessage[]
  }

  if (!payload?.ok) {
    return { ok: false, error: payload?.error || 'Could not load chat.' }
  }

  return {
    ok: true,
    data: {
      thread: payload.thread!,
      messages: payload.messages ?? [],
      markIsAway: Boolean(payload.mark_is_away),
    },
  }
}

export async function sendVisitorMessage(body: string): Promise<ActionResult<{ message: ChatMessage }>> {
  const { sessionId, token } = await getChatCookiePair()
  if (!sessionId || !token) {
    return { ok: false, error: 'No active chat session. Open Contact to start one.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('chat_send_visitor', {
    p_session_id: sessionId,
    p_token: token,
    p_body: body,
  })
  if (error) return { ok: false, error: error.message }

  const payload = data as {
    ok?: boolean
    error?: string
    should_email_mark?: boolean
    message?: ChatMessage
    thread?: {
      visitor_name: string
      visitor_email: string
      piece_title?: string | null
    }
  }

  if (!payload?.ok || !payload.message) {
    return { ok: false, error: payload?.error || 'Could not send.' }
  }

  if (payload.should_email_mark && payload.thread) {
    await notifyMarkEmail({
      visitorName: payload.thread.visitor_name,
      visitorEmail: payload.thread.visitor_email,
      bodies: [payload.message.body],
      pieceTitle: payload.thread.piece_title,
    })
  }

  revalidatePath('/admin/messages')
  return { ok: true, data: { message: payload.message } }
}

export async function clearVisitorChatSession(): Promise<ActionResult> {
  const jar = await cookies()
  jar.delete(CHAT_COOKIE_SESSION)
  jar.delete(CHAT_COOKIE_TOKEN)
  return { ok: true }
}

export async function listChatThreads(): Promise<ActionResult<ChatThreadSummary[]>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data, error } = await supabase
    .from('chat_threads')
    .select(
      'id, visitor_name, visitor_email, piece_id, piece_title, viewing_context, mode, last_message_at, unread_for_mark, created_at'
    )
    .order('last_message_at', { ascending: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data ?? []) as ChatThreadSummary[] }
}

export async function getAdminThread(threadId: string): Promise<
  ActionResult<{
    thread: ChatThreadSummary
    messages: ChatMessage[]
    pieceOffer: {
      title: string
      price: number | null
      inquire_for_price: boolean
    } | null
  }>
> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: thread, error } = await supabase
    .from('chat_threads')
    .select(
      'id, visitor_name, visitor_email, piece_id, piece_title, viewing_context, mode, last_message_at, unread_for_mark, created_at'
    )
    .eq('id', threadId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!thread) return { ok: false, error: 'Thread not found.' }

  const { data: messages, error: msgErr } = await supabase
    .from('chat_messages')
    .select('id, sender, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (msgErr) return { ok: false, error: msgErr.message }

  let pieceOffer: {
    title: string
    price: number | null
    inquire_for_price: boolean
  } | null = null

  const pieceId = (thread as ChatThreadSummary).piece_id
  const fallbackTitle =
    (thread as ChatThreadSummary).piece_title ||
    (thread as ChatThreadSummary).viewing_context ||
    ''

  if (pieceId) {
    const piece = await getPieceById(pieceId)
    if (piece) {
      pieceOffer = {
        title: piece.title || fallbackTitle,
        price: piece.inquire_for_price ? null : piece.price,
        inquire_for_price: piece.inquire_for_price,
      }
    }
  }

  if (!pieceOffer && fallbackTitle) {
    pieceOffer = {
      title: fallbackTitle,
      price: null,
      inquire_for_price: true,
    }
  }

  await supabase.rpc('mark_thread_seen_by_mark', { p_thread_id: threadId })

  return {
    ok: true,
    data: {
      thread: { ...(thread as ChatThreadSummary), unread_for_mark: 0 },
      messages: (messages ?? []) as ChatMessage[],
      pieceOffer,
    },
  }
}

export async function sendMarkReply(
  threadId: string,
  body: string
): Promise<ActionResult<{ message: ChatMessage }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Message is empty.' }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, sender: 'mark', body: trimmed })
    .select('id, sender, body, created_at')
    .single()

  if (error) return { ok: false, error: error.message }

  const { data: thread } = await supabase
    .from('chat_threads')
    .select('unread_for_visitor')
    .eq('id', threadId)
    .maybeSingle()

  await supabase
    .from('chat_threads')
    .update({
      last_message_at: new Date().toISOString(),
      unread_for_visitor: Number(thread?.unread_for_visitor ?? 0) + 1,
    })
    .eq('id', threadId)

  revalidatePath('/admin/messages')
  revalidatePath(`/admin/messages/${threadId}`)
  return { ok: true, data: { message: data as ChatMessage } }
}

export async function countUnreadForMark(): Promise<number> {
  const { supabase, user } = await requireUser()
  if (!user) return 0
  const { data } = await supabase.from('chat_threads').select('unread_for_mark')
  return (data ?? []).reduce((sum, row) => sum + Number(row.unread_for_mark ?? 0), 0)
}

export type UnreadAlert = {
  unreadCount: number
  threadId: string | null
  visitorName: string | null
  pieceTitle: string | null
  preview: string | null
}

/** Latest unread visitor thread — used for Mark’s popup alert. */
export async function peekUnreadAlert(): Promise<UnreadAlert> {
  const empty: UnreadAlert = {
    unreadCount: 0,
    threadId: null,
    visitorName: null,
    pieceTitle: null,
    preview: null,
  }
  const { supabase, user } = await requireUser()
  if (!user) return empty

  const { data: threads } = await supabase
    .from('chat_threads')
    .select('id, visitor_name, piece_title, viewing_context, unread_for_mark, last_message_at')
    .gt('unread_for_mark', 0)
    .order('last_message_at', { ascending: false })
    .limit(1)

  const unreadCount = await countUnreadForMark()
  const top = threads?.[0]
  if (!top) return { ...empty, unreadCount }

  const { data: lastMsg } = await supabase
    .from('chat_messages')
    .select('body')
    .eq('thread_id', top.id)
    .eq('sender', 'visitor')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    unreadCount,
    threadId: top.id,
    visitorName: top.visitor_name,
    pieceTitle: top.viewing_context || top.piece_title,
    preview: lastMsg?.body ?? null,
  }
}

/**
 * Email Mark for visitor messages still unseen after 2 minutes.
 * Call from admin poll (when Mark is online) or a cron with an authenticated path.
 */
export async function processChatEmailReminders(): Promise<
  ActionResult<{ emailed: number }>
> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data, error } = await supabase.rpc('claim_due_chat_email_reminders')
  if (error) return { ok: false, error: error.message }

  const rows = (data ?? []) as Array<{
    message_id: string
    thread_id: string
    body: string
    visitor_name: string
    visitor_email: string
    piece_title?: string | null
  }>

  const byThread = new Map<
    string,
    {
      visitor_name: string
      visitor_email: string
      piece_title?: string | null
      bodies: string[]
    }
  >()

  for (const row of rows) {
    const existing = byThread.get(row.thread_id)
    if (existing) {
      existing.bodies.push(row.body)
      continue
    }
    byThread.set(row.thread_id, {
      visitor_name: row.visitor_name,
      visitor_email: row.visitor_email,
      piece_title: row.piece_title,
      bodies: [row.body],
    })
  }

  let emailed = 0
  for (const digest of byThread.values()) {
    const result = await notifyMarkEmail({
      visitorName: digest.visitor_name,
      visitorEmail: digest.visitor_email,
      bodies: digest.bodies,
      pieceTitle: digest.piece_title,
      subjectPrefix: 'Unread chat (2 min)',
    })
    if (result.sent) emailed += 1
  }

  return { ok: true, data: { emailed } }
}

/**
 * Mark is at the keyboard — call from Messages UI on keystroke (throttled).
 * Visitors learn “away” from the existing chat_fetch poll (no extra client calls).
 */
export async function touchMarkPresence(): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { error } = await supabase.from('mark_presence').upsert({
    id: 1,
    last_active_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
