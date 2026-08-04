import type { PaymentHandles, PaymentMethod } from '@/lib/types'

/** Build a visitor message that keeps the piece tag visible in the thread. */
export function withPieceTag(
  body: string,
  pieceTitle: string | null | undefined,
  pieceId?: string | null
): string {
  const trimmed = body.trim()
  if (!trimmed) return trimmed
  const title = pieceTitle?.trim()
  if (!title) return trimmed
  if (trimmed.startsWith('@')) return trimmed
  const id = pieceId?.trim()
  const tag = id ? `@${title} <#${id}>` : `@${title}`
  return `${tag}\n${trimmed}`
}

const PIECE_ID_RE =
  /^(.+?)\s*<#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>\s*$/i

export function splitPieceTag(body: string): {
  tag: string | null
  pieceId: string | null
  text: string
} {
  const match = body.match(/^@([^\n]+)\n([\s\S]*)$/)
  if (!match) return { tag: null, pieceId: null, text: body }

  const rawTag = match[1].trim()
  const idMatch = rawTag.match(PIECE_ID_RE)
  if (idMatch) {
    return {
      tag: idMatch[1].trim(),
      pieceId: idMatch[2],
      text: match[2],
    }
  }

  return { tag: rawTag, pieceId: null, text: match[2] }
}

export const PAYMENT_METHODS: PaymentMethod[] = ['paypal', 'zelle']

/** Includes retired methods so older chat tokens still render. */
export type PaymentTokenMethod = PaymentMethod | 'venmo' | 'cashapp'

/** Offer details Mark finalizes before sending a payment pill. */
export type PaymentOffer = {
  method: PaymentTokenMethod
  title: string
  /** Dollars as entered by Mark, e.g. "235" or "235.00". */
  amount: string
  /** Optional note shown to the visitor (discount, shipping, etc.). */
  note: string
}

/**
 * Full token with optional offer fields.
 * Also accepts legacy venmo/cashapp tokens so old threads still render.
 * Fields use encodeURIComponent: t=title, a=amount, n=note.
 */
const PAYMENT_TOKEN_RE =
  /\[\[payment:(paypal|zelle|venmo|cashapp)(?:\|([^\]]*))?\]\]/i

export function paymentMethodLabel(method: PaymentTokenMethod | string): string {
  switch (method.toLowerCase()) {
    case 'paypal':
      return 'PayPal'
    case 'zelle':
      return 'Zelle'
    case 'venmo':
      return 'Venmo'
    case 'cashapp':
      return 'Cash App'
    default:
      return method
  }
}

export function paymentPillLabel(offer: PaymentOffer | PaymentMethod): string {
  if (typeof offer === 'string') return `Pay with ${paymentMethodLabel(offer)}`
  const label = `Pay with ${paymentMethodLabel(offer.method)}`
  const amt = formatOfferAmount(offer.amount)
  return amt ? `${label} · ${amt}` : label
}

export function formatOfferAmount(amount: string | null | undefined): string | null {
  if (!amount?.trim()) return null
  const cleaned = amount.trim().replace(/^\$/, '')
  const n = Number(cleaned)
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n)
  }
  return amount.trim().startsWith('$') ? amount.trim() : `$${amount.trim()}`
}

function encodeField(v: string): string {
  return encodeURIComponent(v.trim())
}

function decodeField(v: string | undefined): string {
  if (!v) return ''
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export function paymentToken(offer: PaymentOffer | PaymentMethod): string {
  if (typeof offer === 'string') return `[[payment:${offer}]]`
  const parts = [`payment:${offer.method}`]
  if (offer.title.trim()) parts.push(`t=${encodeField(offer.title)}`)
  if (offer.amount.trim()) parts.push(`a=${encodeField(offer.amount.replace(/^\$/, ''))}`)
  if (offer.note.trim()) parts.push(`n=${encodeField(offer.note)}`)
  return `[[${parts.join('|')}]]`
}

/** Attach (or replace) a payment card token in a Mark reply body. */
export function withPaymentToken(
  body: string,
  offer: PaymentOffer | PaymentMethod | null | undefined
): string {
  const without = body.replace(PAYMENT_TOKEN_RE, '').replace(/\n{3,}/g, '\n\n').trim()
  if (!offer) return without
  const token = paymentToken(offer)
  return without ? `${without}\n${token}` : token
}

export function parsePaymentToken(body: string): {
  method: PaymentTokenMethod | null
  offer: PaymentOffer | null
  text: string
} {
  const match = body.match(PAYMENT_TOKEN_RE)
  if (!match) return { method: null, offer: null, text: body }
  const method = match[1].toLowerCase() as PaymentTokenMethod
  const fields = match[2] ?? ''
  let title = ''
  let amount = ''
  let note = ''
  if (fields) {
    for (const part of fields.split('|')) {
      const eq = part.indexOf('=')
      if (eq < 0) continue
      const key = part.slice(0, eq).toLowerCase()
      const val = decodeField(part.slice(eq + 1))
      if (key === 't') title = val
      else if (key === 'a') amount = val
      else if (key === 'n') note = val
    }
  }
  const offer: PaymentOffer = { method, title, amount, note }
  const text = body
    .replace(PAYMENT_TOKEN_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { method, offer, text }
}

export function paymentHandleFor(
  method: PaymentTokenMethod,
  handles: PaymentHandles | null | undefined
): string | null {
  if (!handles) return null
  switch (method) {
    case 'paypal':
      return handles.paypal_handle?.trim() || null
    case 'zelle':
      return handles.zelle_target?.trim() || null
    default:
      return null
  }
}

/** Display form of the handle. */
export function formatPaymentHandleDisplay(
  method: PaymentTokenMethod,
  handle: string
): string {
  const t = handle.trim()
  if (method === 'paypal') {
    if (/^https?:\/\//i.test(t)) return t
    if (t.includes('@') && !t.startsWith('@')) return t
    const slug = t
      .replace(/^@+/, '')
      .replace(/^paypal\.me\//i, '')
      .replace(/^www\.paypal\.com\/paypalme\//i, '')
    return slug.includes('/') ? t : `paypal.me/${slug}`
  }
  return t
}

export function paymentDeepLink(
  method: PaymentTokenMethod,
  handle: string,
  offer?: Pick<PaymentOffer, 'amount' | 'title' | 'note'> | null
): string | null {
  const t = handle.trim()
  if (!t) return null
  const amountNum = offer?.amount?.trim().replace(/^\$/, '')
  const amountOk = Boolean(amountNum && Number.isFinite(Number(amountNum)))

  if (method === 'paypal') {
    if (/^https?:\/\//i.test(t)) return t
    if (t.includes('@') && !t.startsWith('@')) return null
    const slug = t
      .replace(/^@+/, '')
      .replace(/^paypal\.me\//i, '')
      .replace(/^www\.paypal\.com\/paypalme\//i, '')
      .split(/[/?#]/)[0]
    if (!slug) return null
    let path = `https://www.paypal.com/paypalme/${encodeURIComponent(slug)}`
    if (amountOk) path += `/${encodeURIComponent(amountNum!)}`
    return path
  }

  return null
}
