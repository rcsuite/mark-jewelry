import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminMessagesUrl } from '@/lib/site-url'

/**
 * Processes 2-minute unread chat email reminders.
 * Call every minute from Supabase Cron (pg_cron + pg_net) — not Vercel Cron.
 * Auth: Authorization: Bearer CRON_SECRET
 * Needs SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY + MARK_NOTIFY_EMAIL on Vercel.
 *
 * While Mark has /admin open, AdminIncomingMessageAlert also runs reminders
 * on his authenticated session — so email still works in local/dev without cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Set SUPABASE_SERVICE_ROLE_KEY for cron. Reminders still run when Mark is in /admin.',
      },
      { status: 200 }
    )
  }

  const supabase = createClient(url, serviceKey)
  const { data, error } = await supabase.rpc('claim_due_chat_email_reminders')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    body: string
    thread_id: string
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

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.MARK_NOTIFY_EMAIL
  const from = process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'
  const inboxUrl = adminMessagesUrl()
  let emailed = 0

  if (apiKey && to) {
    for (const digest of byThread.values()) {
      const pieceLine = digest.piece_title ? `\nPiece: ${digest.piece_title}` : ''
      const countNote =
        digest.bodies.length > 1 ? ` (${digest.bodies.length} messages)` : ''
      const digestText =
        digest.bodies.length === 1
          ? digest.bodies[0]
          : digest.bodies
              .map((b, i) => `— Message ${i + 1} —\n${b}`)
              .join('\n\n')
      const text = `Unread chat (2 min) from ${digest.visitor_name} <${digest.visitor_email}>${pieceLine}${countNote}\n\n${digestText}\n\nOpen Admin → Messages:\n${inboxUrl}`
      const htmlParts = digest.bodies
        .map((b, i) => {
          const label =
            digest.bodies.length > 1
              ? `<p style="margin:16px 0 4px;color:#71717A;font-size:12px;">Message ${i + 1}</p>`
              : ''
          const safe = b
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          return `${label}<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${safe}</pre>`
        })
        .join('')
      const html = `<p>Unread chat (2 min) from <strong>${digest.visitor_name}</strong> &lt;${digest.visitor_email}&gt;${
        digest.piece_title ? `<br/>Piece: ${digest.piece_title}` : ''
      }</p>${htmlParts}<p style="margin-top:24px;"><a href="${inboxUrl}">Open Admin → Messages</a></p>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: digest.piece_title
            ? `Unread chat (2 min): ${digest.piece_title}${countNote}`
            : `Unread chat (2 min) from ${digest.visitor_name}${countNote}`,
          text,
          html,
        }),
      })
      if (res.ok) emailed += 1
    }
  }

  return NextResponse.json({
    ok: true,
    claimed: rows.length,
    threads: byThread.size,
    emailed,
  })
}
