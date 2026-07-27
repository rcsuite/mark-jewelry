/**
 * One-shot Resend trial — same payload shape as notifyMarkEmail.
 * Loads .env.local; does not print secrets.
 */
const fs = require('fs')
const path = require('path')

const LOG_URL = 'http://127.0.0.1:7717/ingest/32a7058b-603b-485e-8a2e-c7a23ceb7fdc'
const SESSION = '2e29f9'

function loadEnvLocal() {
  const file = path.join(__dirname, '..', '.env.local')
  const raw = fs.readFileSync(file, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

async function dbg(hypothesisId, location, message, data) {
  try {
    await fetch(LOG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': SESSION,
      },
      body: JSON.stringify({
        sessionId: SESSION,
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
        runId: 'resend-trial-script',
      }),
    })
  } catch {
    /* ignore */
  }
}

async function main() {
  loadEnvLocal()
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.MARK_NOTIFY_EMAIL
  const from =
    process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'

  await dbg('A', 'scripts/trial-resend.js:env', 'trial env', {
    hasApiKey: Boolean(apiKey),
    apiKeyLen: apiKey?.length ?? 0,
    apiKeyPrefix: apiKey?.slice(0, 3) ?? null,
    hasTo: Boolean(to),
    toDomain: to?.includes('@') ? to.split('@')[1] : null,
    fromUsesDefault: !process.env.MARK_NOTIFY_FROM,
    fromHost: from.match(/@([^>]+)/)?.[1] ?? null,
  })

  if (!apiKey || !to) {
    await dbg('A', 'scripts/trial-resend.js:missing', 'missing env', {})
    console.error('FAIL: missing RESEND_API_KEY or MARK_NOTIFY_EMAIL')
    process.exit(1)
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Chat trial: Earthen Miners Resend check',
      text:
        'Trial from Earthen Miners notify path.\n\nIf you got this, Resend is wired correctly.\n\nReply in Admin → Messages.',
    }),
  })

  const body = await res.text()
  if (!res.ok) {
    await dbg('B', 'scripts/trial-resend.js:error', 'Resend non-OK', {
      status: res.status,
      errSnippet: body.slice(0, 500),
      fromHost: from.match(/@([^>]+)/)?.[1] ?? null,
    })
    console.error('FAIL', res.status, body)
    process.exit(1)
  }

  await dbg('A', 'scripts/trial-resend.js:ok', 'Resend accepted', {
    status: res.status,
    bodySnippet: body.slice(0, 200),
  })
  console.log('OK', res.status, body)
}

main().catch(async (err) => {
  await dbg('E', 'scripts/trial-resend.js:throw', 'script threw', {
    err: err instanceof Error ? err.message : String(err),
  })
  console.error(err)
  process.exit(1)
})
