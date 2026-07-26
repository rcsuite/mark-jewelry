import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Processes 2-minute unread chat email reminders (Vercel Cron).
 * Auth: Authorization: Bearer CRON_SECRET
 * Needs SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY + MARK_NOTIFY_EMAIL.
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
    visitor_name: string
    visitor_email: string
    piece_title?: string | null
  }>

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.MARK_NOTIFY_EMAIL
  const from = process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'
  let emailed = 0

  if (apiKey && to) {
    for (const row of rows) {
      const pieceLine = row.piece_title ? `\nPiece: ${row.piece_title}` : ''
      const text = `Unread chat (2 min) from ${row.visitor_name} <${row.visitor_email}>${pieceLine}\n\n${row.body}\n\nReply in Admin → Messages.`
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: row.piece_title
            ? `Unread chat (2 min): ${row.piece_title}`
            : `Unread chat (2 min) from ${row.visitor_name}`,
          text,
        }),
      })
      if (res.ok) emailed += 1
    }
  }

  return NextResponse.json({ ok: true, claimed: rows.length, emailed })
}
