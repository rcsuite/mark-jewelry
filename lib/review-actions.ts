'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { assertPersistentImageUrls, isPersistentImageUrl } from '@/lib/auth-session'
import { toReview, normalizePiece } from '@/lib/queries'
import { reviewInviteUrl, adminReviewsUrl } from '@/lib/site-url'
import { REVIEW_PHOTOS_BUCKET } from '@/lib/upload-image'
import type { Review, ReviewCandidate, ReviewInvite, ShopPiece } from '@/lib/types'

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

const REVIEW_READY_DAYS = 3

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null as null }
  return { supabase, user }
}

function revalidateReviews() {
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/homepage')
  revalidatePath('/admin/reviews')
}

function daysSince(iso: string | null): number {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function toInvite(row: Record<string, unknown>): ReviewInvite {
  const status =
    row.status === 'submitted' || row.status === 'dismissed' ? row.status : 'sent'
  return {
    id: String(row.id),
    piece_id: String(row.piece_id),
    token: String(row.token),
    buyer_name: String(row.buyer_name ?? ''),
    buyer_email: String(row.buyer_email ?? ''),
    status,
    sent_at: String(row.sent_at ?? ''),
    submitted_at: (row.submitted_at as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function getReviewCandidates(): Promise<ReviewCandidate[]> {
  const { supabase, user } = await requireUser()
  if (!user) return []

  const [{ data: pieces, error: pieceErr }, { data: invites, error: inviteErr }] =
    await Promise.all([
      supabase.from('shop_inventory').select('*').eq('sold', true).order('sold_at', {
        ascending: false,
      }),
      supabase.from('review_invites').select('*').order('sent_at', { ascending: false }),
    ])

  if (pieceErr) {
    console.error('getReviewCandidates pieces:', pieceErr.message)
    return []
  }
  if (inviteErr) {
    console.error('getReviewCandidates invites:', inviteErr.message)
  }

  const inviteByPiece = new Map<string, ReviewInvite>()
  for (const row of invites ?? []) {
    const inv = toInvite(row as Record<string, unknown>)
    const existing = inviteByPiece.get(inv.piece_id)
    if (!existing) {
      inviteByPiece.set(inv.piece_id, inv)
      continue
    }
    // Prefer active sent, then submitted, over dismissed
    const rank = (s: ReviewInvite['status']) =>
      s === 'sent' ? 0 : s === 'submitted' ? 1 : 2
    if (rank(inv.status) < rank(existing.status)) {
      inviteByPiece.set(inv.piece_id, inv)
    }
  }

  return (pieces ?? [])
    .map((row) => normalizePiece(row as Record<string, unknown>))
    .map((piece) => {
      const invite = inviteByPiece.get(piece.id) ?? null
      const days = daysSince(piece.sold_at ?? piece.created_at)
      const hasOpenInvite = invite?.status === 'sent'
      const closed =
        invite?.status === 'submitted' || invite?.status === 'dismissed'
      const ready =
        Boolean(piece.buyer_email?.trim()) &&
        days >= REVIEW_READY_DAYS &&
        !hasOpenInvite &&
        !closed
      return { piece, daysSinceSold: days, ready, invite }
    })
    .filter((c) => c.invite?.status !== 'submitted' && c.invite?.status !== 'dismissed')
}

/** Count of sold pieces ready for a manual review invite (3+ days, email on file). */
export async function countReviewDue(): Promise<number> {
  const candidates = await getReviewCandidates()
  return candidates.filter((c) => c.ready).length
}

export async function countPendingReviews(): Promise<number> {
  const { supabase, user } = await requireUser()
  if (!user) return 0
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) {
    console.error('countPendingReviews:', error.message)
    return 0
  }
  return count ?? 0
}

async function sendReviewEmail(input: {
  to: string
  buyerName: string
  pieceTitle: string
  token: string
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'
  if (!apiKey) {
    console.info('[reviews] Email skipped — set RESEND_API_KEY.')
    return { sent: false, reason: 'missing_env' }
  }

  const link = reviewInviteUrl(input.token)
  const greet = input.buyerName.trim() || 'there'
  const text = `Hi ${greet},\n\nMark at Earthen Miners Designs would love to hear how ${input.pieceTitle} is treating you.\n\nLeave a short review here (takes a minute):\n${link}\n\nThank you,\nEarthen Miners Designs`
  const html = `<p>Hi ${escapeHtml(greet)},</p><p>Mark at <strong>Earthen Miners Designs</strong> would love to hear how <strong>${escapeHtml(input.pieceTitle)}</strong> is treating you.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;margin:16px 0;padding:12px 20px;background:#14B8A6;color:#05070A;text-decoration:none;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-size:12px;">Leave a review</a></p><p style="color:#71717A;font-size:13px;">Or open this link:<br/><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>Thank you,<br/>Earthen Miners Designs</p>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `How's ${input.pieceTitle} treating you?`,
        text,
        html,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[reviews] Resend error', res.status, errText)
      return { sent: false, reason: 'resend_error' }
    }
    return { sent: true }
  } catch (err) {
    console.error('[reviews] Resend failed', err)
    return { sent: false, reason: 'network' }
  }
}

async function notifyMarkReviewReceived(review: Review, pieceTitle?: string | null) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.MARK_NOTIFY_EMAIL
  const from = process.env.MARK_NOTIFY_FROM || 'Earthen Miners <onboarding@resend.dev>'
  if (!apiKey || !to) return

  const hub = adminReviewsUrl()
  const pieceLine = pieceTitle ? `\nPiece: ${pieceTitle}` : ''
  const text = `New review from ${review.author}${pieceLine}\n\n"${review.quote}"\n\nApprove or edit in Admin → Reviews:\n${hub}`
  const html = `<p>New review from <strong>${escapeHtml(review.author)}</strong>${
    pieceTitle ? `<br/>Piece: ${escapeHtml(pieceTitle)}` : ''
  }</p><blockquote style="border-left:3px solid #14B8A6;padding-left:12px;color:#A1A1AA;">${escapeHtml(review.quote)}</blockquote><p><a href="${escapeHtml(hub)}">Open Admin → Reviews</a></p>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: pieceTitle ? `Review: ${pieceTitle}` : `Review from ${review.author}`,
        text,
        html,
      }),
    })
  } catch (err) {
    console.error('[reviews] Mark notify failed', err)
  }
}

export async function sendReviewInvite(pieceId: string): Promise<ActionResult<ReviewInvite>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: row, error } = await supabase
    .from('shop_inventory')
    .select('*')
    .eq('id', pieceId)
    .maybeSingle()

  if (error || !row) return { ok: false, error: error?.message ?? 'Piece not found.' }
  const piece = normalizePiece(row as Record<string, unknown>)
  if (!piece.sold) return { ok: false, error: 'Only sold pieces can get a review invite.' }

  const email = piece.buyer_email?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Add the buyer’s email on the piece before sending.' }
  }

  const days = daysSince(piece.sold_at ?? piece.created_at)
  if (days < REVIEW_READY_DAYS) {
    return {
      ok: false,
      error: `Wait until ${REVIEW_READY_DAYS} days after the sale (${REVIEW_READY_DAYS - days} left).`,
    }
  }

  const { data: existing } = await supabase
    .from('review_invites')
    .select('*')
    .eq('piece_id', pieceId)
    .eq('status', 'sent')
    .maybeSingle()

  if (existing) {
    return { ok: false, error: 'An invite is already outstanding for this piece.' }
  }

  const { data: submitted } = await supabase
    .from('review_invites')
    .select('id')
    .eq('piece_id', pieceId)
    .eq('status', 'submitted')
    .maybeSingle()

  if (submitted) {
    return { ok: false, error: 'A review was already collected for this piece.' }
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const buyerName = piece.buyer_name?.trim() || ''

  const { data: inviteRow, error: insertErr } = await supabase
    .from('review_invites')
    .insert({
      piece_id: pieceId,
      token,
      buyer_name: buyerName,
      buyer_email: email,
      status: 'sent',
    })
    .select('*')
    .single()

  if (insertErr || !inviteRow) {
    return { ok: false, error: insertErr?.message ?? 'Could not create invite.' }
  }

  const mailed = await sendReviewEmail({
    to: email,
    buyerName,
    pieceTitle: piece.title,
    token,
  })

  if (!mailed.sent) {
    await supabase.from('review_invites').delete().eq('id', inviteRow.id)
    return {
      ok: false,
      error:
        mailed.reason === 'missing_env'
          ? 'Email is not configured (RESEND_API_KEY).'
          : 'Email failed to send. Try again.',
    }
  }

  revalidateReviews()
  return { ok: true, data: toInvite(inviteRow as Record<string, unknown>) }
}

export async function dismissReviewCandidate(pieceId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data: open } = await supabase
    .from('review_invites')
    .select('id')
    .eq('piece_id', pieceId)
    .eq('status', 'sent')
    .maybeSingle()

  if (open) {
    const { error } = await supabase
      .from('review_invites')
      .update({ status: 'dismissed' })
      .eq('id', open.id)
    if (error) return { ok: false, error: error.message }
  } else {
    // Record a dismiss so the ready badge clears without an email
    const { data: piece } = await supabase
      .from('shop_inventory')
      .select('buyer_name, buyer_email')
      .eq('id', pieceId)
      .maybeSingle()
    const email = String(piece?.buyer_email ?? '').trim()
    if (!email) return { ok: false, error: 'Nothing to dismiss.' }
    const token = `dismissed-${crypto.randomUUID()}`
    const { error } = await supabase.from('review_invites').insert({
      piece_id: pieceId,
      token,
      buyer_name: String(piece?.buyer_name ?? ''),
      buyer_email: email,
      status: 'dismissed',
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateReviews()
  return { ok: true }
}

export async function updatePieceBuyer(input: {
  pieceId: string
  buyer_name: string
  buyer_email: string
}): Promise<ActionResult<ShopPiece>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data, error } = await supabase
    .from('shop_inventory')
    .update({
      buyer_name: input.buyer_name.trim() || null,
      buyer_email: input.buyer_email.trim().toLowerCase() || null,
    })
    .eq('id', input.pieceId)
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateReviews()
  return { ok: true, data: normalizePiece(data as Record<string, unknown>) }
}

export async function publishReview(id: string): Promise<ActionResult<Review>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'published' })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidateReviews()
  return { ok: true, data: toReview(data as Record<string, unknown>) }
}

export type PublicInvitePayload = {
  id: string
  token: string
  buyer_name: string
  buyer_email: string
  piece_id: string
  piece_title: string
  piece_photo: string | null
}

export async function loadReviewInvite(
  token: string
): Promise<ActionResult<PublicInvitePayload>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('review_invite_by_token', {
    p_token: token,
  })
  if (error) return { ok: false, error: error.message }
  const payload = data as { ok?: boolean; error?: string; invite?: PublicInvitePayload }
  if (!payload?.ok || !payload.invite) {
    return { ok: false, error: payload?.error ?? 'Invalid link.' }
  }
  return { ok: true, data: payload.invite }
}

export async function uploadReviewInvitePhoto(
  token: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const loaded = await loadReviewInvite(token)
  if (!loaded.ok || !loaded.data) {
    return { ok: false, error: !loaded.ok ? loaded.error : 'Invalid link.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose a photo first.' }
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: 'Photo must be under 8MB.' }
  }
  const type = file.type || 'image/jpeg'
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) {
    return { ok: false, error: 'Use a JPG, PNG, WebP, or GIF.' }
  }

  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg'
  const path = `invites/${token}/${Date.now()}.${ext}`

  try {
    const admin = createServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await admin.storage.from(REVIEW_PHOTOS_BUCKET).upload(path, buffer, {
      contentType: type,
      cacheControl: '3600',
      upsert: false,
    })
    if (error) return { ok: false, error: error.message }
    const { data } = admin.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path)
    if (!isPersistentImageUrl(data.publicUrl)) {
      return { ok: false, error: 'Upload returned an invalid URL.' }
    }
    return { ok: true, data: { url: data.publicUrl } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Upload failed.' }
  }
}

export async function submitPublicReview(input: {
  token: string
  quote: string
  author: string
  location: string
  rating: number
  image_url?: string | null
}): Promise<ActionResult> {
  if (input.image_url) {
    try {
      assertPersistentImageUrls([input.image_url])
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid photo.' }
    }
  }

  const supabase = await createClient()
  const inviteLoaded = await loadReviewInvite(input.token)
  const pieceTitle = inviteLoaded.ok ? inviteLoaded.data?.piece_title : null

  const { data, error } = await supabase.rpc('submit_review_from_invite', {
    p_token: input.token,
    p_quote: input.quote,
    p_author: input.author,
    p_location: input.location,
    p_rating: input.rating,
    p_image_url: input.image_url ?? null,
  })

  if (error) return { ok: false, error: error.message }
  const payload = data as { ok?: boolean; error?: string; review_id?: string }
  if (!payload?.ok) return { ok: false, error: payload?.error ?? 'Could not submit.' }

  if (payload.review_id) {
    const { data: reviewRow } = await createServiceClient()
      .from('reviews')
      .select('*')
      .eq('id', payload.review_id)
      .maybeSingle()
    if (reviewRow) {
      await notifyMarkReviewReceived(
        toReview(reviewRow as Record<string, unknown>),
        pieceTitle
      )
    }
  }

  revalidateReviews()
  return { ok: true }
}
